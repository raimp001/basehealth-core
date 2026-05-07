"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Check,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  loadMilestones,
  upsertMilestone,
  markMilestoneCompleted,
  type ScreeningMilestone,
} from "@/lib/health-store"

function recomputeStatus(m: ScreeningMilestone): ScreeningMilestone {
  if (m.completedAt) return { ...m, status: "completed" }
  if (!m.dueDate) return m
  const today = new Date().toISOString().slice(0, 10)
  if (m.dueDate < today) return { ...m, status: "overdue" }
  return { ...m, status: m.status === "scheduled" ? "scheduled" : "due" }
}

function categoryColor(cat?: ScreeningMilestone["category"]): string {
  switch (cat) {
    case "cancer":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/40"
    case "cardiovascular":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/40"
    case "metabolic":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40"
    case "infectious":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
    case "mental-health":
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40"
    default:
      return "bg-card/60 text-muted-foreground border-border/60"
  }
}

function statusBadge(status: ScreeningMilestone["status"]) {
  switch (status) {
    case "overdue":
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/40">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case "scheduled":
      return (
        <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40">
          <CalendarClock className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40">
          <CalendarClock className="h-3 w-3 mr-1" />
          Due soon
        </Badge>
      )
  }
}

function formatDate(iso?: string) {
  if (!iso) return "Not scheduled"
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function relativeDays(iso?: string): string | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + "T00:00:00")
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "today"
  if (diff > 0) return `in ${diff} day${diff === 1 ? "" : "s"}`
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago`
}

export function ScreeningMilestones() {
  const [items, setItems] = useState<ScreeningMilestone[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<Partial<ScreeningMilestone>>({
    name: "",
    description: "",
    dueDate: "",
    category: "other",
  })

  useEffect(() => {
    setItems(loadMilestones().map(recomputeStatus))
  }, [])

  const groups = useMemo(() => {
    const overdue = items.filter((m) => m.status === "overdue")
    const due = items.filter((m) => m.status === "due" || m.status === "scheduled")
    const completed = items.filter((m) => m.status === "completed")
    return { overdue, due, completed }
  }, [items])

  function handleAdd() {
    if (!draft.name) return
    const ms: ScreeningMilestone = {
      id: `ms-${Date.now()}`,
      name: draft.name!,
      description: draft.description,
      dueDate: draft.dueDate || undefined,
      category: draft.category as ScreeningMilestone["category"],
      status: "due",
    }
    upsertMilestone(ms)
    setItems(loadMilestones().map(recomputeStatus))
    setDraft({ name: "", description: "", dueDate: "", category: "other" })
    setShowAdd(false)
  }

  function handleComplete(id: string) {
    markMilestoneCompleted(id)
    setItems(loadMilestones().map(recomputeStatus))
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          label="Overdue"
          value={groups.overdue.length}
          tone="red"
        />
        <Stat
          icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
          label="Coming up"
          value={groups.due.length}
          tone="amber"
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          label="Completed"
          value={groups.completed.length}
          tone="emerald"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setShowAdd((s) => !s)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add milestone
        </Button>
        <Button asChild variant="outline" className="border-border/60">
          <Link href="/screening">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Run full screening assessment
          </Link>
        </Button>
      </div>

      {showAdd && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-foreground">
              Add a screening milestone
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Mammogram, Pap smear, etc."
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={draft.dueDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <select
                  value={draft.category ?? "other"}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as ScreeningMilestone["category"] })
                  }
                  className="h-10 w-full rounded-md border border-border/60 bg-card/50 text-sm px-3 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
                >
                  <option value="cancer">Cancer</option>
                  <option value="cardiovascular">Cardiovascular</option>
                  <option value="metabolic">Metabolic</option>
                  <option value="infectious">Infectious</option>
                  <option value="mental-health">Mental health</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Input
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="USPSTF / clinician guidance"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Section
        title="Overdue"
        emptyMessage="Nothing overdue — great work staying on top of preventive care."
        items={groups.overdue}
        onComplete={handleComplete}
      />
      <Section
        title="Coming up"
        emptyMessage="No upcoming milestones tracked. Add one above to get started."
        items={groups.due}
        onComplete={handleComplete}
      />
      <Section
        title="Completed"
        emptyMessage="Completed milestones will appear here once you mark something done."
        items={groups.completed}
        onComplete={handleComplete}
      />
    </div>
  )
}

function Section({
  title,
  emptyMessage,
  items,
  onComplete,
}: {
  title: string
  emptyMessage: string
  items: ScreeningMilestone[]
  onComplete: (id: string) => void
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
        {title}
        <Badge variant="secondary" className="bg-card/60 border border-border/60 text-foreground ml-1">
          {items.length}
        </Badge>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-card/30 p-4">
          {emptyMessage}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((m) => (
            <li key={m.id}>
              <Card
                className={`border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors ${
                  m.status === "overdue" ? "border-red-500/30" : ""
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {m.name}
                      </h3>
                      {m.category && (
                        <Badge className={`mt-1 text-[10px] ${categoryColor(m.category)}`}>
                          {m.category}
                        </Badge>
                      )}
                    </div>
                    {statusBadge(m.status)}
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {m.completedAt ? `Done ${formatDate(m.completedAt)}` : formatDate(m.dueDate)}
                      </span>
                      {!m.completedAt && m.dueDate && (
                        <span className="ml-2">({relativeDays(m.dueDate)})</span>
                      )}
                    </div>
                    {m.source && <span className="text-muted-foreground">{m.source}</span>}
                  </div>
                  {!m.completedAt && (
                    <div className="flex items-center justify-end pt-1 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onComplete(m.id)}
                        className="text-emerald-600 hover:text-emerald-500"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark complete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "red" | "amber" | "emerald"
}) {
  const ring =
    tone === "red"
      ? "border-red-500/30"
      : tone === "amber"
        ? "border-amber-500/30"
        : "border-emerald-500/30"
  return (
    <div className={`rounded-lg border ${ring} bg-card/60 backdrop-blur-sm p-4`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
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
