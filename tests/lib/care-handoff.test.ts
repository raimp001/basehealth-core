import { describe, expect, it, beforeEach } from "vitest"
import {
  PROVIDER_HANDOFF_STORAGE_KEY,
  SCHEDULING_HANDOFF_STORAGE_KEY,
  SCREENING_HANDOFF_STORAGE_KEY,
  PAYMENT_HANDOFF_STORAGE_KEY,
  fallbackHrefForCareHandoff,
  isFreshCareHandoff,
  resolveCareHandoff,
  safeSessionGetItem,
  safeSessionRemoveItem,
  safeSessionSetItem,
  type CareHandoffAction,
} from "@/lib/care-handoff"

describe("care-handoff: storage helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it("round-trips a JSON payload through safeSession helpers", () => {
    const payload = {
      source: "screening" as const,
      providerName: "Primary care",
      providerKind: "screening",
      reason: "Colonoscopy",
      createdAt: Date.now(),
    }
    const ok = safeSessionSetItem(SCHEDULING_HANDOFF_STORAGE_KEY, JSON.stringify(payload))
    expect(ok).toBe(true)

    const stored = safeSessionGetItem(SCHEDULING_HANDOFF_STORAGE_KEY)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored as string)).toEqual(payload)

    safeSessionRemoveItem(SCHEDULING_HANDOFF_STORAGE_KEY)
    expect(safeSessionGetItem(SCHEDULING_HANDOFF_STORAGE_KEY)).toBeNull()
  })

  it("isFreshCareHandoff respects the TTL", () => {
    const now = Date.now()
    expect(isFreshCareHandoff(now)).toBe(true)
    expect(isFreshCareHandoff(now - 60_000)).toBe(true)
    // 16 minutes ago — past default 15-minute TTL
    expect(isFreshCareHandoff(now - 16 * 60 * 1000)).toBe(false)
    expect(isFreshCareHandoff(undefined)).toBe(false)
  })
})

describe("care-handoff: resolveCareHandoff", () => {
  it("keeps clinical screening questions in chat (returns null)", () => {
    // Clinical questions are answered in chat first — only an explicit "start"
    // intent should hand off into the screening assessment form.
    const action = resolveCareHandoff(
      "What cancer screening does a 50-year-old woman need?",
      "test-agent",
    )
    expect(action).toBeNull()
  })

  it("routes explicit assessment requests to /screening", () => {
    const action = resolveCareHandoff(
      "Give me a screening assessment for my risk factors.",
      "test-agent",
    )
    expect(action).not.toBeNull()
    expect(action?.storageKey).toBe(SCREENING_HANDOFF_STORAGE_KEY)
    expect(action?.href.startsWith("/screening")).toBe(true)
  })

  it("routes provider search intent to the providers surface", () => {
    const action = resolveCareHandoff(
      "Find a primary care doctor near me in Portland.",
      "test-agent",
    )
    expect(action).not.toBeNull()
    expect(action?.storageKey).toBe(PROVIDER_HANDOFF_STORAGE_KEY)
    expect(action?.href.startsWith("/providers")).toBe(true)
  })

  it("routes payment intent to the payment surface", () => {
    const action = resolveCareHandoff(
      "Pay $25 USDC fee on Base.",
      "payment",
    )
    expect(action).not.toBeNull()
    expect(action?.storageKey).toBe(PAYMENT_HANDOFF_STORAGE_KEY)
    expect(action?.href.startsWith("/payment/base")).toBe(true)
  })
})

describe("care-handoff: fallback URLs", () => {
  it("emits a /providers/search URL with q + specialty for provider handoffs", () => {
    const action: CareHandoffAction = {
      label: "Find provider",
      href: "/providers/search",
      storageKey: PROVIDER_HANDOFF_STORAGE_KEY,
      payload: {
        source: "screening",
        query: "Cardiologist",
        specialty: "Cardiology",
        autorun: false,
        createdAt: Date.now(),
      },
    }
    const href = fallbackHrefForCareHandoff(action)
    expect(href).toContain("/providers/search")
    expect(href).toContain("q=Cardiologist")
    expect(href).toContain("specialty=Cardiology")
  })

  it("emits an /appointment/book URL for scheduling handoffs", () => {
    const action: CareHandoffAction = {
      label: "Book appointment",
      href: "/appointment/book",
      storageKey: SCHEDULING_HANDOFF_STORAGE_KEY,
      payload: {
        source: "screening",
        providerName: "Primary care",
        providerKind: "screening",
        reason: "Colonoscopy",
        createdAt: Date.now(),
      },
    }
    const href = fallbackHrefForCareHandoff(action)
    expect(href.startsWith("/appointment/book")).toBe(true)
  })
})
