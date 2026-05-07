import { describe, expect, it, beforeEach, vi } from "vitest"

// Use a real in-memory localStorage shim instead of the global vi.fn() mock
// from tests/setup.ts so we can verify round-trip persistence.
function installMemoryStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      },
    },
  })
  return store
}

describe("lib/health-store", () => {
  beforeEach(() => {
    installMemoryStorage()
    vi.resetModules()
  })

  it("persists medications and toggles adherence for today", async () => {
    const store = await import("@/lib/health-store")
    const today = new Date().toISOString().slice(0, 10)

    const med = {
      id: "med-1",
      name: "Lisinopril",
      dosage: "10 mg",
      frequency: "Once daily",
      schedule: "Morning",
      refillsRemaining: 3,
      updatedAt: new Date().toISOString(),
    }
    store.upsertMedication(med)

    expect(store.loadMedications()).toHaveLength(1)
    store.markAdherence("med-1", today, true)
    const after = store.loadMedications()
    expect(after[0].adherence?.[today]).toBe(true)

    store.removeMedication("med-1")
    expect(store.loadMedications()).toHaveLength(0)
  })

  it("upserts and orders journal entries newest-first", async () => {
    const store = await import("@/lib/health-store")
    store.upsertJournalEntry({
      id: "j-1",
      date: "2026-05-01",
      symptoms: ["Headache"],
      updatedAt: new Date().toISOString(),
    })
    store.upsertJournalEntry({
      id: "j-2",
      date: "2026-05-05",
      symptoms: ["Fatigue"],
      updatedAt: new Date().toISOString(),
    })
    const entries = store.loadJournal()
    expect(entries).toHaveLength(2)
    expect(entries[0].date).toBe("2026-05-05")
    expect(entries[1].date).toBe("2026-05-01")
  })

  it("seeds default screening milestones on first load", async () => {
    const store = await import("@/lib/health-store")
    const items = store.loadMilestones()
    expect(items.length).toBeGreaterThan(0)
    const names = items.map((m) => m.name)
    expect(names).toContain("Blood pressure")
    expect(names).toContain("Hemoglobin A1c")
  })

  it("marks a milestone as completed and persists it", async () => {
    const store = await import("@/lib/health-store")
    const items = store.loadMilestones()
    const target = items[0]
    store.markMilestoneCompleted(target.id)
    const updated = store.loadMilestones().find((m) => m.id === target.id)!
    expect(updated.status).toBe("completed")
    expect(updated.completedAt).toBeTruthy()
  })

  it("supports a cart subtotal", async () => {
    const store = await import("@/lib/health-store")
    store.saveCart([
      { drugId: "rx-a", name: "A", strength: "10 mg", priceUsd: 4, quantity: 2 },
      { drugId: "rx-b", name: "B", strength: "20 mg", priceUsd: 6, quantity: 1 },
    ])
    expect(store.cartSubtotal()).toBe(14)
    store.addToCart({ drugId: "rx-a", name: "A", strength: "10 mg", priceUsd: 4, quantity: 1 })
    expect(store.cartSubtotal()).toBe(18)
    store.removeFromCart("rx-a")
    expect(store.cartSubtotal()).toBe(6)
    store.clearCart()
    expect(store.cartSubtotal()).toBe(0)
  })
})
