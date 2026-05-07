/**
 * Local-first health data store.
 *
 * Persists to localStorage today. The shape mirrors what we'll later store in
 * Prisma (Medication, JournalEntry, Screening) so we can swap to a real
 * `/api/health/*` backend without changing component code.
 *
 * All access goes through this module so we can centralize a future migration
 * to encrypted-at-rest storage.
 */

export type Medication = {
  id: string
  name: string
  dosage: string
  frequency: string
  /** "Morning", "Evening", or HH:MM */
  schedule: string
  /** Optional ISO start date */
  startedAt?: string
  /** Refills remaining */
  refillsRemaining?: number
  /** Optional prescriber name */
  prescriber?: string
  /** Optional pharmacy name */
  pharmacy?: string
  notes?: string
  /** ISO yyyy-mm-dd → boolean adherence */
  adherence?: Record<string, boolean>
  /** ISO timestamp when last edited */
  updatedAt: string
}

export type JournalEntry = {
  id: string
  /** ISO yyyy-mm-dd */
  date: string
  symptoms: string[]
  vitals?: {
    /** mmHg, e.g. "120/80" */
    bloodPressure?: string
    /** beats per minute */
    heartRate?: number
    /** Fahrenheit */
    temperature?: number
    /** lbs */
    weight?: number
    /** percent SpO2 */
    oxygenSat?: number
    /** mg/dL */
    glucose?: number
  }
  /** 1 (worst) – 10 (best) */
  mood?: number
  notes?: string
  /** ISO timestamp */
  updatedAt: string
}

export type ScreeningStatus = "due" | "overdue" | "completed" | "scheduled"

export type ScreeningMilestone = {
  id: string
  name: string
  description?: string
  /** ISO yyyy-mm-dd */
  dueDate?: string
  /** ISO yyyy-mm-dd */
  completedAt?: string
  status: ScreeningStatus
  /** USPSTF / NCCN guideline reference */
  source?: string
  category?: "cancer" | "cardiovascular" | "metabolic" | "infectious" | "mental-health" | "other"
}

const KEYS = {
  medications: "basehealth:medications:v1",
  journal: "basehealth:journal:v1",
  milestones: "basehealth:milestones:v1",
  cart: "basehealth:medication-cart:v1",
} as const

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage disabled — silently ignore for now
  }
}

// Medications -----------------------------------------------------------

export function loadMedications(): Medication[] {
  return read<Medication[]>(KEYS.medications, [])
}

export function saveMedications(meds: Medication[]) {
  write(KEYS.medications, meds)
}

export function upsertMedication(med: Medication) {
  const all = loadMedications()
  const idx = all.findIndex((m) => m.id === med.id)
  if (idx >= 0) all[idx] = med
  else all.unshift(med)
  saveMedications(all)
}

export function removeMedication(id: string) {
  saveMedications(loadMedications().filter((m) => m.id !== id))
}

export function markAdherence(medId: string, dateIso: string, taken: boolean) {
  const all = loadMedications()
  const med = all.find((m) => m.id === medId)
  if (!med) return
  med.adherence = { ...(med.adherence ?? {}), [dateIso]: taken }
  med.updatedAt = new Date().toISOString()
  saveMedications(all)
}

// Journal ---------------------------------------------------------------

export function loadJournal(): JournalEntry[] {
  return read<JournalEntry[]>(KEYS.journal, [])
}

export function saveJournal(entries: JournalEntry[]) {
  write(KEYS.journal, entries)
}

export function upsertJournalEntry(entry: JournalEntry) {
  const all = loadJournal()
  const idx = all.findIndex((e) => e.id === entry.id)
  if (idx >= 0) all[idx] = entry
  else all.unshift(entry)
  // Keep newest first
  all.sort((a, b) => (a.date < b.date ? 1 : -1))
  saveJournal(all)
}

export function removeJournalEntry(id: string) {
  saveJournal(loadJournal().filter((e) => e.id !== id))
}

// Milestones ------------------------------------------------------------

export function loadMilestones(): ScreeningMilestone[] {
  const stored = read<ScreeningMilestone[]>(KEYS.milestones, [])
  if (stored.length > 0) return stored
  return defaultMilestones()
}

export function saveMilestones(items: ScreeningMilestone[]) {
  write(KEYS.milestones, items)
}

export function upsertMilestone(item: ScreeningMilestone) {
  const all = loadMilestones()
  const idx = all.findIndex((m) => m.id === item.id)
  if (idx >= 0) all[idx] = item
  else all.unshift(item)
  saveMilestones(all)
}

export function markMilestoneCompleted(id: string) {
  const all = loadMilestones()
  const m = all.find((x) => x.id === id)
  if (!m) return
  m.completedAt = new Date().toISOString().slice(0, 10)
  m.status = "completed"
  saveMilestones(all)
}

/** Sensible defaults from USPSTF age-based screening guidance. */
function defaultMilestones(): ScreeningMilestone[] {
  const today = new Date()
  const inDays = (d: number) => {
    const t = new Date(today)
    t.setDate(t.getDate() + d)
    return t.toISOString().slice(0, 10)
  }
  return [
    {
      id: "ms-bp",
      name: "Blood pressure",
      description: "Annual screening for hypertension; USPSTF Grade A.",
      dueDate: inDays(14),
      status: "due",
      source: "USPSTF 2021",
      category: "cardiovascular",
    },
    {
      id: "ms-lipid",
      name: "Lipid panel",
      description: "Cholesterol screening every 4–6 years if baseline normal.",
      dueDate: inDays(45),
      status: "due",
      source: "USPSTF / ACC",
      category: "cardiovascular",
    },
    {
      id: "ms-a1c",
      name: "Hemoglobin A1c",
      description: "Diabetes screening for adults 35–70 with overweight/obesity.",
      dueDate: inDays(-30),
      status: "overdue",
      source: "USPSTF 2021",
      category: "metabolic",
    },
    {
      id: "ms-colorectal",
      name: "Colorectal cancer screening",
      description: "Begin at age 45 (FIT yearly, colonoscopy q10y).",
      dueDate: inDays(180),
      status: "due",
      source: "USPSTF 2021",
      category: "cancer",
    },
    {
      id: "ms-skin",
      name: "Annual skin check",
      description: "Dermatology exam for skin cancer surveillance.",
      dueDate: inDays(90),
      status: "due",
      source: "AAD",
      category: "cancer",
    },
    {
      id: "ms-mental",
      name: "Depression / anxiety screen",
      description: "PHQ-9 / GAD-7 yearly for adults.",
      dueDate: inDays(60),
      status: "due",
      source: "USPSTF 2023",
      category: "mental-health",
    },
  ]
}

// Cart ------------------------------------------------------------------

export type CartItem = {
  drugId: string
  name: string
  strength: string
  /** USD per fill, used for display + Base Pay total */
  priceUsd: number
  quantity: number
}

export function loadCart(): CartItem[] {
  return read<CartItem[]>(KEYS.cart, [])
}

export function saveCart(items: CartItem[]) {
  write(KEYS.cart, items)
}

export function addToCart(item: CartItem) {
  const cart = loadCart()
  const existing = cart.find((c) => c.drugId === item.drugId)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push(item)
  }
  saveCart(cart)
}

export function removeFromCart(drugId: string) {
  saveCart(loadCart().filter((c) => c.drugId !== drugId))
}

export function clearCart() {
  saveCart([])
}

export function cartSubtotal(items: CartItem[] = loadCart()): number {
  return items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0)
}
