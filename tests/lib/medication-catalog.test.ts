import { describe, expect, it } from "vitest"
import { searchCatalog, getDrug, MEDICATION_CATALOG } from "@/lib/medication-catalog"

describe("lib/medication-catalog", () => {
  it("has at least one drug per major category", () => {
    const cats = new Set(MEDICATION_CATALOG.map((d) => d.category))
    expect(cats.has("cardiovascular")).toBe(true)
    expect(cats.has("metabolic")).toBe(true)
    expect(cats.has("mental-health")).toBe(true)
    expect(cats.has("infectious")).toBe(true)
  })

  it("searches by brand or generic name (case-insensitive)", () => {
    const a = searchCatalog("lisinopril")
    expect(a.some((d) => d.id === "rx-lisinopril-10")).toBe(true)
    const b = searchCatalog("OZEMPIC")
    expect(b.some((d) => d.id === "rx-semaglutide-1")).toBe(true)
  })

  it("filters by category", () => {
    const cv = searchCatalog("", "cardiovascular")
    expect(cv.length).toBeGreaterThan(0)
    expect(cv.every((d) => d.category === "cardiovascular")).toBe(true)
  })

  it("getDrug returns a known entry", () => {
    expect(getDrug("rx-metformin-500")?.name).toBe("Metformin")
    expect(getDrug("rx-does-not-exist")).toBeUndefined()
  })
})
