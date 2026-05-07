import "server-only"

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limiter"
import { basePayConfig } from "@/lib/base-pay-service"
import { isWalletAddress } from "@/lib/assistant-pass"

type SessionLike =
  | {
      user?: {
        id?: string
        role?: string
        walletAddress?: string | null
      }
    }
  | null
  | undefined

type ViewerContext = {
  userId: string | null
  role: string | null
  walletAddress: string | null
}

function resolveViewerContext(session: SessionLike, accessWalletAddress?: string | null): ViewerContext {
  const sessionWallet =
    typeof session?.user?.walletAddress === "string" && isWalletAddress(session.user.walletAddress)
      ? session.user.walletAddress.toLowerCase()
      : null

  const fallbackWallet =
    typeof accessWalletAddress === "string" && isWalletAddress(accessWalletAddress)
      ? accessWalletAddress.toLowerCase()
      : null

  return {
    userId: typeof session?.user?.id === "string" ? session.user.id : null,
    role: typeof session?.user?.role === "string" ? session.user.role : null,
    walletAddress: sessionWallet || fallbackWallet,
  }
}

function toAmountString(amount: unknown): string {
  if (typeof amount === "number") return amount.toFixed(2)
  if (typeof amount === "string") {
    const parsed = Number.parseFloat(amount)
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"
  }
  if (amount && typeof amount === "object" && "toString" in (amount as any)) {
    const parsed = Number.parseFloat((amount as any).toString())
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"
  }
  return "0.00"
}

function canAccessOrder(params: {
  viewer: ViewerContext
  bookingUserWallet?: string | null
  paymentSender?: string | null
}): boolean {
  if ((params.viewer.role || "").toUpperCase() === "ADMIN") return true
  const viewerWallet = params.viewer.walletAddress?.toLowerCase()
  if (!viewerWallet) return false

  if (params.bookingUserWallet && params.bookingUserWallet.toLowerCase() === viewerWallet) return true
  if (params.paymentSender && params.paymentSender.toLowerCase() === viewerWallet) return true
  return false
}

export function buildChatTools(options: {
  req: Request
  session?: SessionLike
  accessWalletAddress?: string | null
}) {
  const origin = new URL(options.req.url).origin
  const clientId = getClientIdentifier(options.req)
  const viewer = resolveViewerContext(options.session, options.accessWalletAddress)

  const searchProviders = tool({
    description:
      "Search for healthcare providers by query, specialty, and location. Use this when the user asks for provider recommendations. Ask for missing specialty/location first. Do not fabricate providers.",
    parameters: z
      .object({
        query: z.string().trim().min(1).max(160).optional(),
        specialty: z.string().trim().min(1).max(120).optional(),
        location: z.string().trim().min(1).max(160).optional(),
        limit: z.number().int().min(1).max(10).optional(),
      })
      .refine((value) => Boolean(value.query || value.specialty), {
        message: "Provide at least query or specialty.",
      }),
    execute: async ({ query, specialty, location, limit }) => {
      const rate = rateLimit(`${clientId}:tool:search_providers`, { windowMs: 60_000, maxRequests: 25 })
      if (!rate.allowed) {
        return {
          kind: "error",
          error: "Rate limit exceeded. Please wait a moment and try again.",
        }
      }

      const url = new URL("/api/providers/search", origin)
      if (query) url.searchParams.set("query", query)
      if (specialty) url.searchParams.set("specialty", specialty)
      if (location) url.searchParams.set("location", location)
      url.searchParams.set("limit", String(limit ?? 5))

      const res = await fetch(url, { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        return {
          kind: "error",
          error: json?.error || "Provider search failed.",
        }
      }

      const providers = Array.isArray(json.providers) ? json.providers : []
      const trimmed = providers.slice(0, limit ?? 5).map((provider: any) => ({
        id: provider?.npi || provider?.id || provider?.providerId || null,
        name: provider?.name || provider?.providerName || "Provider",
        specialty: provider?.specialty || "Healthcare Provider",
        city: provider?.city || null,
        state: provider?.state || null,
        address: provider?.address || null,
        phone: provider?.phone || null,
        distance: typeof provider?.distance === "number" ? provider.distance : null,
        rating: typeof provider?.rating === "number" ? provider.rating : null,
        acceptingPatients: typeof provider?.acceptingPatients === "boolean" ? provider.acceptingPatients : null,
        source: provider?.source || null,
      }))

      return {
        kind: "providers",
        success: true,
        query: query || null,
        specialty: specialty || null,
        location: location || null,
        total: typeof json.total === "number" ? json.total : trimmed.length,
        providers: trimmed,
        timestamp: typeof json.timestamp === "string" ? json.timestamp : new Date().toISOString(),
      }
    },
  })

  const getOrderStatus = tool({
    description:
      "Look up a BaseHealth booking/payment status by orderId (booking id) or paymentId/txHash. Use this when the user is asking about a specific payment/booking. If you do not have an orderId/tx hash, ask for it first. Returns a minimal, privacy-safe status summary.",
    parameters: z
      .object({
        orderId: z.string().trim().min(6).max(128),
      })
      .strict(),
    execute: async ({ orderId }) => {
      const rate = rateLimit(`${clientId}:tool:get_order_status`, { windowMs: 60_000, maxRequests: 40 })
      if (!rate.allowed) {
        return {
          kind: "error",
          error: "Rate limit exceeded. Please wait a moment and try again.",
        }
      }

      const normalized = orderId.trim()
      const isTxHash = /^0x[a-fA-F0-9]{64}$/.test(normalized)

      if (isTxHash) {
        const tx = await prisma.transaction.findFirst({
          where: {
            OR: [{ transactionHash: normalized }, { providerId: normalized }],
          },
          orderBy: { createdAt: "desc" },
        })

        if (!tx) {
          return { kind: "order_status", found: false, orderId: normalized, type: "payment" }
        }

        const sender = (tx.metadata as any)?.sender
        if (!canAccessOrder({ viewer, paymentSender: typeof sender === "string" ? sender : null })) {
          return { kind: "error", error: "Not authorized to view this payment." }
        }

        return {
          kind: "order_status",
          found: true,
          orderId: normalized,
          type: "payment",
          payment: {
            paymentId: tx.transactionHash || tx.providerId || tx.id,
            status: tx.status,
            provider: tx.provider,
            amount: toAmountString(tx.amount),
            currency: tx.currency,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            completedAt: tx.completedAt ? tx.completedAt.toISOString() : null,
          },
        }
      }

      const booking = await prisma.booking.findUnique({
        where: { id: normalized },
        include: {
          user: { select: { walletAddress: true } },
          caregiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { walletAddress: true } },
            },
          },
        },
      })

      if (booking) {
        const sender = (booking.paymentMetadata as any)?.payment?.sender
        const bookingUserWallet = booking.user?.walletAddress || null

        if (
          !canAccessOrder({
            viewer,
            bookingUserWallet,
            paymentSender: typeof sender === "string" ? sender : null,
          })
        ) {
          return { kind: "error", error: "Not authorized to view this order." }
        }

        const caregiverName =
          `${booking.caregiver?.firstName || ""} ${booking.caregiver?.lastName || ""}`.trim() || null

        return {
          kind: "order_status",
          found: true,
          orderId: booking.id,
          type: "booking",
          booking: {
            bookingId: booking.id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            amount: toAmountString(booking.amount),
            currency: booking.currency || "USDC",
            provider: booking.paymentProvider || "BASE_USDC",
            paymentId: booking.paymentProviderId || null,
            caregiver: booking.caregiver
              ? {
                  id: booking.caregiver.id,
                  name: caregiverName,
                  walletAddress: booking.caregiver.user?.walletAddress || null,
                }
              : null,
            createdAt: booking.createdAt.toISOString(),
            updatedAt: booking.updatedAt.toISOString(),
          },
        }
      }

      // Fallback: transactions recorded with metadata.orderId for standalone purchases/tips.
      const tx = await prisma.transaction.findFirst({
        where: { metadata: { path: ["orderId"], equals: normalized } as any },
        orderBy: { createdAt: "desc" },
      })

      if (!tx) {
        return { kind: "order_status", found: false, orderId: normalized, type: "unknown" }
      }

      const sender = (tx.metadata as any)?.sender
      if (!canAccessOrder({ viewer, paymentSender: typeof sender === "string" ? sender : null })) {
        return { kind: "error", error: "Not authorized to view this order." }
      }

      return {
        kind: "order_status",
        found: true,
        orderId: normalized,
        type: "payment",
        payment: {
          paymentId: tx.transactionHash || tx.providerId || tx.id,
          status: tx.status,
          provider: tx.provider,
          amount: toAmountString(tx.amount),
          currency: tx.currency,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          completedAt: tx.completedAt ? tx.completedAt.toISOString() : null,
        },
      }
    },
  })

  const createCheckout = tool({
    description:
      "Prepare a one-tap Base Pay checkout configuration (no funds move until the user taps Pay). Only call this after confirming the purpose and amount with the user. For booking payments, provide bookingId to lock the amount.",
    parameters: z
      .object({
        bookingId: z.string().trim().min(6).max(64).optional(),
        amountUsd: z.number().positive().max(1000).optional(),
        serviceName: z.string().trim().min(2).max(80).optional(),
        serviceType: z.string().trim().min(2).max(64).optional(),
        serviceDescription: z.string().trim().min(2).max(200).optional(),
        collectEmail: z.boolean().optional(),
      })
      .refine((value) => Boolean(value.bookingId || (value.amountUsd && value.serviceName)), {
        message: "Provide bookingId, or provide amountUsd + serviceName.",
      }),
    execute: async ({ bookingId, amountUsd, serviceName, serviceType, serviceDescription, collectEmail }) => {
      const rate = rateLimit(`${clientId}:tool:create_checkout`, { windowMs: 60_000, maxRequests: 20 })
      if (!rate.allowed) {
        return {
          kind: "error",
          error: "Rate limit exceeded. Please wait a moment and try again.",
        }
      }

      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId.trim() },
          include: {
            user: { select: { walletAddress: true } },
            caregiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { walletAddress: true } },
              },
            },
          },
        })

        if (!booking) {
          return { kind: "error", error: "Booking not found." }
        }

        const sender = (booking.paymentMetadata as any)?.payment?.sender
        const bookingUserWallet = booking.user?.walletAddress || null
        if (
          !canAccessOrder({
            viewer,
            bookingUserWallet,
            paymentSender: typeof sender === "string" ? sender : null,
          })
        ) {
          return { kind: "error", error: "Not authorized to create checkout for this booking." }
        }

        const caregiverName =
          `${booking.caregiver?.firstName || ""} ${booking.caregiver?.lastName || ""}`.trim() ||
          "Provider"

        const amount = Number.parseFloat(toAmountString(booking.amount))

        return {
          kind: "checkout",
          checkout: {
            amountUsd: Number.isFinite(amount) ? amount : 0,
            serviceName: serviceName || "Booking payment",
            serviceType: serviceType || "booking-payment",
            serviceDescription: serviceDescription || "Complete payment to confirm your booking.",
            providerName: caregiverName,
            providerWallet: booking.caregiver?.user?.walletAddress || basePayConfig.recipientAddress,
            orderId: booking.id,
            providerId: booking.caregiver?.id || "basehealth",
            collectEmail: Boolean(collectEmail),
          },
        }
      }

      const safeAmount = Number.isFinite(amountUsd) ? amountUsd! : 0
      if (!(safeAmount > 0)) return { kind: "error", error: "Invalid amount." }

      // Create a stable order id for receipts/refunds tracking.
      const orderId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      logger.info("Prepared chat checkout", {
        orderId,
        amountUsd: safeAmount,
        serviceType: serviceType || "chat-checkout",
        viewerWallet: viewer.walletAddress || "unknown",
      })

      return {
        kind: "checkout",
        checkout: {
          amountUsd: safeAmount,
          serviceName: serviceName || "Checkout",
          serviceType: serviceType || "chat-checkout",
          serviceDescription: serviceDescription || "Complete payment in Base to continue.",
          providerName: "BaseHealth",
          providerWallet: basePayConfig.recipientAddress,
          orderId,
          providerId: "basehealth",
          collectEmail: Boolean(collectEmail),
        },
      }
    },
  })

  return {
    search_providers: searchProviders,
    get_order_status: getOrderStatus,
    create_checkout: createCheckout,
  }
}
