import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createBillingReceipt, createTransactionReceipt } from "@/lib/base-billing"

/**
 * Billing Receipts API
 *
 * GET /api/billing/receipts
 * Query:
 * - bookingId (optional)
 * - email (optional)
 * - walletAddress (optional)
 * - limit (optional, default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")
    const email = searchParams.get("email")?.trim()
    const walletAddress = searchParams.get("walletAddress")?.trim()
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10)))

    if (!bookingId && !email && !walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide at least one filter: bookingId, email, or walletAddress",
        },
        { status: 400 },
      )
    }

    const where: any = {}
    const normalizedWallet = walletAddress?.toLowerCase()

    if (bookingId) {
      where.id = bookingId
    }

    if (email) {
      const users = await prisma.user.findMany({
        where: {
          email: { equals: email, mode: "insensitive" as const },
        },
        select: { id: true },
      })

      where.userId = users.length > 0 ? { in: users.map((user) => user.id) } : "__no_matching_user__"
    }

    const lookupLimit = normalizedWallet && !email ? Math.max(limit, 100) : limit

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        caregiver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: lookupLimit,
    })

    const filteredBookings = normalizedWallet
      ? bookings.filter((booking) => {
          const metadata = (booking.paymentMetadata || {}) as any
          const sender = metadata?.payment?.sender
          return typeof sender === "string" && sender.toLowerCase() === normalizedWallet
        })
      : bookings

    const bookingReceipts = filteredBookings.map((booking) => createBillingReceipt(booking))

    const standaloneTransactions = await prisma.transaction.findMany({
      where: {
        bookingId: null,
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: Math.max(limit * 4, 80),
    })

    const filteredTransactions = standaloneTransactions.filter((transaction) => {
      const metadata = (transaction.metadata || {}) as any
      const sender = typeof metadata?.sender === "string" ? metadata.sender.toLowerCase() : ""
      const emailCandidates = [
        metadata?.patientEmail,
        metadata?.email,
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase())

      const walletMatches = normalizedWallet ? sender === normalizedWallet : true
      const emailMatches = email ? emailCandidates.includes(email.toLowerCase()) : true
      return walletMatches && emailMatches
    })

    const transactionReceipts = filteredTransactions.map((transaction) => createTransactionReceipt(transaction))
    const receipts = [...bookingReceipts, ...transactionReceipts]
      .sort((left, right) => {
        const leftTs = Date.parse(left.paidAt || left.issuedAt)
        const rightTs = Date.parse(right.paidAt || right.issuedAt)
        return rightTs - leftTs
      })
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      total: receipts.length,
      receipts,
    })
  } catch (error) {
    console.error("Error fetching billing receipts:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch billing receipts",
      },
      { status: 500 },
    )
  }
}
