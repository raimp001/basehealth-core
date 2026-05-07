"use client"

/**
 * CareHandoffBanner — a small dismissible banner that surfaces incoming
 * handoff context (from chat → screening, providers, scheduling, payment).
 *
 * Reads the handoff payload from sessionStorage on mount. If a fresh payload
 * exists, it's shown as a "Continued from your chat" pill so the user has
 * confidence the context carried over.
 */

import { useEffect, useState } from "react"
import { ArrowRight, MessageCircle, X } from "lucide-react"
import Link from "next/link"

import {
  isFreshCareHandoff,
  PROVIDER_HANDOFF_STORAGE_KEY,
  SCHEDULING_HANDOFF_STORAGE_KEY,
  SCREENING_HANDOFF_STORAGE_KEY,
  PAYMENT_HANDOFF_STORAGE_KEY,
  safeSessionGetItem,
  safeSessionRemoveItem,
  type CareHandoffStorageKey,
  type ProviderHandoffPayload,
  type SchedulingHandoffPayload,
  type ScreeningHandoffPayload,
  type PaymentHandoffPayload,
} from "@/lib/care-handoff"

type Surface = "screening" | "providers" | "scheduling" | "payment"

const SURFACE_KEYS: Record<Surface, CareHandoffStorageKey> = {
  screening: SCREENING_HANDOFF_STORAGE_KEY,
  providers: PROVIDER_HANDOFF_STORAGE_KEY,
  scheduling: SCHEDULING_HANDOFF_STORAGE_KEY,
  payment: PAYMENT_HANDOFF_STORAGE_KEY,
}

type HandoffSummary = {
  primary: string
  secondary?: string
}

function summarize(surface: Surface, raw: string): HandoffSummary | null {
  try {
    const parsed = JSON.parse(raw)
    if (!isFreshCareHandoff(parsed?.createdAt)) return null

    switch (surface) {
      case "screening": {
        const p = parsed as ScreeningHandoffPayload
        return {
          primary: "Continued from your chat",
          secondary: p.narrative,
        }
      }
      case "providers": {
        const p = parsed as ProviderHandoffPayload
        return {
          primary: "Searching from your chat",
          secondary: p.query,
        }
      }
      case "scheduling": {
        const p = parsed as SchedulingHandoffPayload
        return {
          primary: `Booking ${p.providerName}`,
          secondary: p.reason,
        }
      }
      case "payment": {
        const p = parsed as PaymentHandoffPayload
        return {
          primary: `Pay $${p.amountUsd.toFixed(2)} on Base`,
          secondary: p.reason,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

export interface CareHandoffBannerProps {
  surface: Surface
  /**
   * If true, the banner consumes (removes) the storage entry on mount so the
   * downstream page can read it once. Default: true.
   */
  consume?: boolean
  className?: string
}

export function CareHandoffBanner({
  surface,
  consume = true,
  className,
}: CareHandoffBannerProps) {
  const [summary, setSummary] = useState<HandoffSummary | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = SURFACE_KEYS[surface]
    const raw = safeSessionGetItem(key)
    if (!raw) return

    const next = summarize(surface, raw)
    if (next) setSummary(next)

    if (consume) {
      safeSessionRemoveItem(key)
    }
  }, [surface, consume])

  if (!summary || dismissed) return null

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-primary/40 bg-card/40 p-3 text-sm backdrop-blur ${
        className || ""
      }`}
      role="status"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/55 text-primary">
        <MessageCircle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{summary.primary}</p>
        {summary.secondary ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary.secondary}</p>
        ) : null}
      </div>
      <Link
        href="/chat"
        className="hidden items-center gap-1 self-center rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
      >
        Back to chat
        <ArrowRight className="h-3 w-3 text-primary" />
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss handoff banner"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card/40 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
