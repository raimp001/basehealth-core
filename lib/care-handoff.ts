/**
 * BaseHealth care handoff bridge.
 *
 * Adapted from the OpenRx chat-first handoff pattern. The goal: a single
 * conversational entry point ("ask") that *answers in chat first* and only
 * hands the user off to a structured flow (screening, provider search,
 * scheduling, billing/payment) when a real action is needed.
 *
 * Handoff payloads are written to sessionStorage so PHI is never persisted
 * to a backend, with a URL-fallback for cross-tab navigation and sandboxed
 * iframes where storage is blocked.
 */

export const SCREENING_HANDOFF_STORAGE_KEY = "basehealth:screening-handoff"
export const PROVIDER_HANDOFF_STORAGE_KEY = "basehealth:provider-handoff"
export const SCHEDULING_HANDOFF_STORAGE_KEY = "basehealth:scheduling-handoff"
export const PAYMENT_HANDOFF_STORAGE_KEY = "basehealth:payment-handoff"

export interface ScreeningHandoffPayload {
  source: "chat" | "link"
  narrative: string
  autorun: boolean
  createdAt: number
}

export interface ProviderHandoffPayload {
  source: "chat" | "link" | "screening"
  query: string
  specialty?: string
  autorun: boolean
  createdAt: number
}

export interface SchedulingHandoffPayload {
  source: "provider" | "screening" | "chat"
  providerName: string
  providerKind: string
  specialty?: string
  npi?: string
  phone?: string
  fullAddress?: string
  reason: string
  query?: string
  createdAt: number
}

export interface PaymentHandoffPayload {
  source: "chat" | "screening" | "provider"
  /** USD amount (decimal). Renderer is responsible for converting to USDC on Base. */
  amountUsd: number
  reason: string
  /** Optional Base address that should receive the funds. */
  payee?: string
  createdAt: number
}

export type CareHandoffStorageKey =
  | typeof SCREENING_HANDOFF_STORAGE_KEY
  | typeof PROVIDER_HANDOFF_STORAGE_KEY
  | typeof SCHEDULING_HANDOFF_STORAGE_KEY
  | typeof PAYMENT_HANDOFF_STORAGE_KEY

export interface CareHandoffAction {
  label: string
  href: string
  storageKey: CareHandoffStorageKey
  payload:
    | ScreeningHandoffPayload
    | ProviderHandoffPayload
    | SchedulingHandoffPayload
    | PaymentHandoffPayload
}

// -------- safe storage helpers --------

export function safeSessionGetItem(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false
  try {
    window.sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeSessionRemoveItem(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore — handoffs still work via URL
  }
}

// -------- URL builders for fallback / cross-tab --------

export function providerSearchHrefFromHandoff(
  query: string,
  source: ProviderHandoffPayload["source"] = "link",
  specialty?: string,
) {
  const params = new URLSearchParams({
    handoff: source === "chat" ? "chat" : source,
    autorun: "1",
    q: query,
  })
  if (specialty) params.set("specialty", specialty)
  return `/providers/search?${params.toString()}`
}

export function schedulingHrefFromHandoff(payload: SchedulingHandoffPayload) {
  const params = new URLSearchParams({
    handoff: "provider",
    source: payload.source,
    providerName: payload.providerName,
    providerKind: payload.providerKind,
    reason: payload.reason,
  })
  if (payload.specialty) params.set("specialty", payload.specialty)
  if (payload.npi) params.set("npi", payload.npi)
  if (payload.phone) params.set("phone", payload.phone)
  if (payload.fullAddress) params.set("fullAddress", payload.fullAddress)
  if (payload.query) params.set("query", payload.query)
  return `/appointment/book?${params.toString()}`
}

export function paymentHrefFromHandoff(payload: PaymentHandoffPayload) {
  const params = new URLSearchParams({
    handoff: payload.source,
    amount: payload.amountUsd.toString(),
    reason: payload.reason,
  })
  if (payload.payee) params.set("payee", payload.payee)
  return `/payment/base?${params.toString()}`
}

export function screeningHrefFromHandoff(payload: ScreeningHandoffPayload) {
  const params = new URLSearchParams({
    handoff: payload.source,
    autorun: payload.autorun ? "1" : "0",
    prompt: payload.narrative,
  })
  return `/screening?${params.toString()}`
}

export function fallbackHrefForCareHandoff(action: CareHandoffAction) {
  switch (action.storageKey) {
    case PROVIDER_HANDOFF_STORAGE_KEY: {
      const p = action.payload as ProviderHandoffPayload
      return providerSearchHrefFromHandoff(p.query, p.source, p.specialty)
    }
    case SCHEDULING_HANDOFF_STORAGE_KEY:
      return schedulingHrefFromHandoff(action.payload as SchedulingHandoffPayload)
    case PAYMENT_HANDOFF_STORAGE_KEY:
      return paymentHrefFromHandoff(action.payload as PaymentHandoffPayload)
    case SCREENING_HANDOFF_STORAGE_KEY:
    default:
      return screeningHrefFromHandoff(action.payload as ScreeningHandoffPayload)
  }
}

// -------- intent detection --------

const SCREENING_TERMS = [
  "screening",
  "screen",
  "risk",
  "risk score",
  "recommendation",
  "recommendations",
  "recs",
  "colonoscopy",
  "mammogram",
  "pap",
  "hpv",
  "ldct",
  "psa",
  "prostate",
  "colon",
  "colorectal",
  "breast cancer",
  "lung cancer",
  "cervical",
  "brca",
  "lynch",
  "mutation",
  "germline",
  "family history",
  "uspstf",
  "preventive",
  "preventative",
]

const CARE_SEARCH_TERMS = [
  "provider",
  "doctor",
  "physician",
  "pcp",
  "primary care",
  "find care",
  "find a",
  "find me",
  "book",
  "schedule",
  "appointment",
  "specialist",
  "caregiver",
  "care network",
  "npi",
  "near me",
  "near ",
  "radiology",
  "imaging",
  "mammogram center",
  "lab",
  "laboratory",
  "colonoscopy center",
  "clinic",
  "clinician",
  "telemedicine",
  "telehealth",
  "second opinion",
]

const BILLING_TERMS = [
  "bill",
  "billing",
  "claim",
  "denial",
  "denied",
  "coverage",
  "insurance",
  "prior auth",
  "prior authorization",
  "cost",
  "copay",
  "estimate",
]

const PAYMENT_TERMS = [
  "pay",
  "checkout",
  "usdc",
  "crypto",
  "wallet",
  "base pay",
  "on-chain",
  "onchain",
]

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function hasClinicalContext(value: string) {
  return (
    /\b(?:age\s*)?\d{2}\b/.test(value) ||
    includesAny(value, ["father", "mother", "sibling", "smoker", "mutation", "history of"])
  )
}

export function isFreshCareHandoff(createdAt?: number, ttlMs = 15 * 60 * 1000) {
  return (
    typeof createdAt === "number" && Number.isFinite(createdAt) && Date.now() - createdAt <= ttlMs
  )
}

/**
 * Decide whether a free-text user message should be answered in chat (return
 * null) or routed to a structured action surface (return a handoff).
 *
 * Screening and clinical questions answer in chat first — we never short-
 * circuit to a form when the AI can give the answer directly.
 */
export function resolveCareHandoff(message: string, agentId: string): CareHandoffAction | null {
  const trimmed = message.trim()
  if (!trimmed) return null

  const lowered = trimmed.toLowerCase()
  const now = Date.now()

  // 1) Screening / clinical questions stay in chat. We do *not* push them
  //    into the screening form unless the user is explicitly asking for an
  //    assessment (e.g. "give me a screening assessment").
  const wantsAssessment =
    /\b(start|run|do|take|begin|give me)\b.*\b(screening|assessment|risk)\b/.test(lowered) ||
    agentId === "screening-assessment"

  if (wantsAssessment) {
    return {
      label: "Start screening assessment",
      href: "/screening?handoff=chat",
      storageKey: SCREENING_HANDOFF_STORAGE_KEY,
      payload: {
        source: "chat",
        narrative: trimmed,
        autorun: true,
        createdAt: now,
      },
    }
  }

  const looksLikeScreening =
    agentId === "screening" ||
    includesAny(lowered, SCREENING_TERMS) ||
    (hasClinicalContext(lowered) &&
      includesAny(lowered, ["what should", "what do i need", "recommend", "recs"]))

  if (looksLikeScreening) {
    // Answer the clinical question in chat — no handoff.
    return null
  }

  // 2) Care search / scheduling — hand off to the provider directory.
  const looksLikeCareSearch =
    agentId === "scheduling" || includesAny(lowered, CARE_SEARCH_TERMS)

  if (looksLikeCareSearch) {
    return {
      label: "Search care network",
      href: "/providers/search?handoff=chat",
      storageKey: PROVIDER_HANDOFF_STORAGE_KEY,
      payload: {
        source: "chat",
        query: trimmed,
        autorun: true,
        createdAt: now,
      },
    }
  }

  // 3) Payment / checkout — route to Base Pay.
  const looksLikePayment =
    agentId === "payment" ||
    (includesAny(lowered, PAYMENT_TERMS) && /\$|usd|usdc|fee|amount/.test(lowered))

  if (looksLikePayment) {
    const amountMatch = lowered.match(/\$?\s*(\d+(?:\.\d{1,2})?)/)
    const amountUsd = amountMatch ? Math.max(0.01, parseFloat(amountMatch[1])) : 0.25
    return {
      label: "Pay on Base",
      href: "/payment/base?handoff=chat",
      storageKey: PAYMENT_HANDOFF_STORAGE_KEY,
      payload: {
        source: "chat",
        amountUsd,
        reason: trimmed,
        createdAt: now,
      },
    }
  }

  // 4) Billing/coverage questions answer in chat too.
  if (agentId === "billing" || includesAny(lowered, BILLING_TERMS)) {
    return null
  }

  return null
}
