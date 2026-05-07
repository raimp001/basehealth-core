"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Trash2,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  Wind,
  Scale,
  Smile,
  CalendarDays,
  Save,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  loadJournal,
  upsertJournalEntry,
  removeJournalEntry,
  type JournalEntry,
} from "@/lib/health-store"

const COMMON_SYMPTOMS = [
  "Fatigue",
  "Headache",
  "Nausea",
  "Cough",
  "Shortness of breath",
  "Chest pain",
  "Dizziness",
  "Insomnia",
  "Joint pain",
  "Anxiety",
  "Low mood",
  "Fever",
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function HealthJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<JournalEntry | null>(null)

  useEffect(() => {
    setEntries(loadJournal())
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
    for (const e of entries) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [entries])

  function startNew() {
    setEditing({
      id: `j-${Date.now()}`,
      date: todayIso(),
      symptoms: [],
      vitals: {},
      mood: 7,
      notes: "",
      updatedAt: new Date().toISOString(),
    })
    setShowForm(true)
  }

  function startEdit(entry: JournalEntry) {
    setEditing({ ...entry })
    setShowForm(true)
  }

  function handleSave() {
    if (!editing) return
    upsertJournalEntry({ ...editing, updatedAt: new Date().toISOString() })
    setEntries(loadJournal())
    setShowForm(false)
    setEditing(null)
  }

  function handleDelete(id: string) {
    removeJournalEntry(id)
    setEntries(loadJournal())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          onClick={startNew}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
        >
          <Plus className="h-4 w-4 mr-2" />
          New journal entry
        </Button>
      </div>

      {showForm && editing && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Log how you&apos;re feeling
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowForm(false)
                  setEditing(null)
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Field label="Date">
              <Input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="bg-background/40 border-border/60 max-w-xs"
              />
            </Field>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Symptoms
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map((s) => {
                  const active = editing.symptoms.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          symptoms: active
                            ? editing.symptoms.filter((x) => x !== s)
                            : [...editing.symptoms, s],
                        })
                      }
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 ${
                        active
                          ? "bg-primary/10 text-foreground border-primary/50"
                          : "bg-card/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Vitals
              </Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Blood pressure">
                  <Input
                    placeholder="120/80"
                    value={editing.vitals?.bloodPressure ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: { ...(editing.vitals ?? {}), bloodPressure: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Heart rate (bpm)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="68"
                    value={editing.vitals?.heartRate ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: {
                          ...(editing.vitals ?? {}),
                          heartRate: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Temperature (°F)">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={editing.vitals?.temperature ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: {
                          ...(editing.vitals ?? {}),
                          temperature: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Weight (lbs)">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="160"
                    value={editing.vitals?.weight ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: {
                          ...(editing.vitals ?? {}),
                          weight: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="SpO₂ (%)">
                  <Input
                    type="number"
                    placeholder="98"
                    value={editing.vitals?.oxygenSat ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: {
                          ...(editing.vitals ?? {}),
                          oxygenSat: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Glucose (mg/dL)">
                  <Input
                    type="number"
                    placeholder="95"
                    value={editing.vitals?.glucose ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        vitals: {
                          ...(editing.vitals ?? {}),
                          glucose: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mood ({editing.mood ?? 7}/10)
              </Label>
              <input
                type="range"
                min={1}
                max={10}
                value={editing.mood ?? 7}
                onChange={(e) => setEditing({ ...editing, mood: Number(e.target.value) })}
                className="mt-2 w-full accent-cyan-500"
                aria-label="Mood (1 to 10)"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <Field label="Notes">
              <Textarea
                rows={4}
                value={editing.notes ?? ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Free text about how today went, sleep, exercise, what you ate, etc."
                className="bg-background/40 border-border/60"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  setEditing(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/30">
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-7 w-7 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No journal entries yet. Capture symptoms, vitals, and how you&apos;re feeling
              over time.
            </p>
            <Button
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={startNew}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add first entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ol className="relative space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
          {grouped.map(([date, list]) => (
            <li key={date} className="relative pl-9">
              <span className="absolute left-0 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/40">
                <CalendarDays className="h-3 w-3" />
              </span>
              <h3 className="font-display text-sm font-semibold text-foreground">
                {formatDate(date)}
              </h3>
              <div className="mt-3 space-y-3">
                {list.map((e) => (
                  <Card
                    key={e.id}
                    className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-4 space-y-3">
                      {e.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {e.symptoms.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="bg-card/60 border border-border/60 text-foreground text-[11px]"
                            >
                              <Activity className="h-3 w-3 mr-1" />
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {e.vitals && Object.values(e.vitals).some(Boolean) && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {e.vitals.bloodPressure && (
                            <Vital icon={<Heart className="h-3.5 w-3.5" />} label="BP" value={e.vitals.bloodPressure} />
                          )}
                          {e.vitals.heartRate && (
                            <Vital icon={<Heart className="h-3.5 w-3.5" />} label="HR" value={`${e.vitals.heartRate} bpm`} />
                          )}
                          {e.vitals.temperature && (
                            <Vital icon={<Thermometer className="h-3.5 w-3.5" />} label="Temp" value={`${e.vitals.temperature}°F`} />
                          )}
                          {e.vitals.weight && (
                            <Vital icon={<Scale className="h-3.5 w-3.5" />} label="Weight" value={`${e.vitals.weight} lbs`} />
                          )}
                          {e.vitals.oxygenSat && (
                            <Vital icon={<Wind className="h-3.5 w-3.5" />} label="SpO₂" value={`${e.vitals.oxygenSat}%`} />
                          )}
                          {e.vitals.glucose && (
                            <Vital icon={<Droplet className="h-3.5 w-3.5" />} label="Glucose" value={`${e.vitals.glucose} mg/dL`} />
                          )}
                        </div>
                      )}
                      {typeof e.mood === "number" && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Smile className="h-3.5 w-3.5" />
                          Mood: <span className="text-foreground font-medium">{e.mood}/10</span>
                        </div>
                      )}
                      {e.notes && (
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                          {e.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(e)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(e.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Vital({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-foreground font-medium tabular-nums">{value}</span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
