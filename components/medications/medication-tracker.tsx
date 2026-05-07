"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Pill,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Clock,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  loadMedications,
  upsertMedication,
  removeMedication,
  markAdherence,
  type Medication,
} from "@/lib/health-store"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function adherenceRate(med: Medication): number {
  const entries = med.adherence ? Object.values(med.adherence) : []
  if (entries.length === 0) return 0
  const taken = entries.filter(Boolean).length
  return Math.round((taken / entries.length) * 100)
}

export function MedicationTracker() {
  const [meds, setMeds] = useState<Medication[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<Partial<Medication>>({
    name: "",
    dosage: "",
    frequency: "Once daily",
    schedule: "Morning",
    refillsRemaining: 3,
  })

  useEffect(() => {
    setMeds(loadMedications())
  }, [])

  const today = todayIso()

  const ordered = useMemo(
    () => [...meds].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [meds],
  )

  function handleAdd() {
    if (!draft.name || !draft.dosage) return
    const med: Medication = {
      id: `med-${Date.now()}`,
      name: draft.name,
      dosage: draft.dosage,
      frequency: draft.frequency || "Once daily",
      schedule: draft.schedule || "Morning",
      refillsRemaining: draft.refillsRemaining ?? 0,
      prescriber: draft.prescriber,
      pharmacy: draft.pharmacy,
      notes: draft.notes,
      adherence: {},
      updatedAt: new Date().toISOString(),
    }
    upsertMedication(med)
    setMeds(loadMedications())
    setDraft({
      name: "",
      dosage: "",
      frequency: "Once daily",
      schedule: "Morning",
      refillsRemaining: 3,
    })
    setShowAdd(false)
  }

  function handleToggle(med: Medication) {
    const taken = !med.adherence?.[today]
    markAdherence(med.id, today, taken)
    setMeds(loadMedications())
  }

  function handleRemove(id: string) {
    removeMedication(id)
    setMeds(loadMedications())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setShowAdd((s) => !s)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add medication
        </Button>
        <Button asChild variant="outline" className="border-border/60">
          <Link href="/medications/order">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Order medications
          </Link>
        </Button>
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/journal">
            Open journal
          </Link>
        </Button>
      </div>

      {showAdd && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Add a medication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Lisinopril"
                />
              </Field>
              <Field label="Dosage">
                <Input
                  value={draft.dosage ?? ""}
                  onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                  placeholder="e.g. 10 mg"
                />
              </Field>
              <Field label="Frequency">
                <Input
                  value={draft.frequency ?? ""}
                  onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                  placeholder="Once daily"
                />
              </Field>
              <Field label="Schedule">
                <Input
                  value={draft.schedule ?? ""}
                  onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
                  placeholder="Morning, Evening, 08:00"
                />
              </Field>
              <Field label="Prescriber">
                <Input
                  value={draft.prescriber ?? ""}
                  onChange={(e) => setDraft({ ...draft, prescriber: e.target.value })}
                  placeholder="Dr. Smith"
                />
              </Field>
              <Field label="Pharmacy">
                <Input
                  value={draft.pharmacy ?? ""}
                  onChange={(e) => setDraft({ ...draft, pharmacy: e.target.value })}
                  placeholder="Walgreens — Main St"
                />
              </Field>
              <Field label="Refills remaining">
                <Input
                  type="number"
                  min={0}
                  value={draft.refillsRemaining ?? 0}
                  onChange={(e) =>
                    setDraft({ ...draft, refillsRemaining: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <Input
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Take with food"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save medication
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {ordered.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/30">
          <CardContent className="py-10 text-center">
            <Pill className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No medications yet. Add your first to start tracking adherence and refills.
            </p>
            <Button
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowAdd(true)}
            >
              Add medication
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((med) => {
            const takenToday = !!med.adherence?.[today]
            const rate = adherenceRate(med)
            const lowRefills = (med.refillsRemaining ?? 0) <= 1
            return (
              <Card
                key={med.id}
                className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-foreground truncate">
                          {med.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-card/60 border border-border/60 text-foreground"
                        >
                          {med.dosage}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {med.frequency} · {med.schedule}
                      </p>
                      {med.prescriber && (
                        <p className="text-xs text-muted-foreground">
                          Prescribed by {med.prescriber}
                          {med.pharmacy ? ` · ${med.pharmacy}` : ""}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(med)}
                      aria-pressed={takenToday}
                      aria-label={takenToday ? "Mark today as not taken" : "Mark today as taken"}
                      className={`shrink-0 rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 ${
                        takenToday ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {takenToday ? (
                        <CheckCircle2 className="h-7 w-7" />
                      ) : (
                        <Circle className="h-7 w-7" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-muted-foreground">Adherence (last logged)</p>
                      <p className="mt-0.5 text-base font-semibold text-foreground">{rate}%</p>
                    </div>
                    <div
                      className={`rounded-lg border p-3 ${
                        lowRefills
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-border/60 bg-background/40"
                      }`}
                    >
                      <p className={lowRefills ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                        Refills remaining
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-foreground flex items-center gap-1.5">
                        {med.refillsRemaining ?? 0}
                        {lowRefills && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </p>
                    </div>
                  </div>

                  {med.notes && (
                    <p className="mt-3 text-xs text-muted-foreground">{med.notes}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-border/60"
                    >
                      <Link href={`/medications/order?refill=${encodeURIComponent(med.name)}`}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Request refill
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(med.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
