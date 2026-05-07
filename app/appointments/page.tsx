"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Stethoscope,
  Wallet,
} from "lucide-react"

const REQUEST_STORAGE_KEY = "basehealth:appointment-requests"

type StoredRequest = {
  id: string
  providerName: string
  providerKind: string
  specialty?: string
  reason: string
  urgency: "routine" | "soon" | "urgent"
  preferredWindow: string
  contactEmail: string
  contactPhone?: string
  notes?: string
  fullAddress?: string
  createdAt: number
}

const URGENCY_STYLE: Record<StoredRequest["urgency"], string> = {
  routine: "border-border/60 bg-card/30 text-muted-foreground",
  soon: "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
}

const URGENCY_LABEL: Record<StoredRequest["urgency"], string> = {
  routine: "Routine",
  soon: "Soon",
  urgent: "Urgent",
}

function relativeTime(ms: number) {
  const diff = Date.now() - ms
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} d ago`
}

export default function AppointmentsPage() {
  const [requests, setRequests] = useState<StoredRequest[] | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(REQUEST_STORAGE_KEY)
      const list: StoredRequest[] = raw ? JSON.parse(raw) : []
      setRequests(list)
    } catch {
      setRequests([])
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/patient-portal"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Patient portal
          </Link>
          <Link
            href="/appointment/book"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New request
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            Visits
          </p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Your appointments
          </h1>
          <p className="mt-3 max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
            Open visit requests and confirmed bookings. Copays settle in USDC on Base when a
            provider needs them.
          </p>
        </div>

        {requests === null ? (
          <div className="rounded-2xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border/60 bg-card/30 p-4 backdrop-blur-md sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-foreground truncate">{r.providerName}</p>
                      {r.specialty ? (
                        <span className="rounded-full border border-border/60 bg-background/55 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {r.specialty}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground/90 line-clamp-2">{r.reason}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${URGENCY_STYLE[r.urgency]}`}
                      >
                        {URGENCY_LABEL[r.urgency]}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(r.createdAt)}
                      </span>
                      {r.preferredWindow ? <span>· {r.preferredWindow}</span> : null}
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/payment/base?reason=${encodeURIComponent(`Visit copay for ${r.providerName}`)}&amount=25`}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/45 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/60 hover:bg-card/60"
                    >
                      <Wallet className="h-3 w-3 text-primary" />
                      Pay copay
                    </Link>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{r.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-2xl border border-border/60 bg-card/30 p-5">
          <p className="text-sm font-semibold text-foreground">Need help deciding what to book?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask BaseHealth and we'll point you to the right kind of visit, then prefill the request.
          </p>
          <Link
            href="/chat"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground/90 hover:text-foreground"
          >
            Open assistant <ArrowRight className="h-4 w-4 text-primary" />
          </Link>
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/30 p-8 text-center backdrop-blur-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/55">
        <CalendarClock className="h-5 w-5 text-primary" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
        No visit requests yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        When you ask BaseHealth to find care, send a request, or book a screening follow-up, you'll
        see it here.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/providers/search"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90"
        >
          Find a provider
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/30 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card/45"
        >
          Ask the assistant
        </Link>
      </div>
    </div>
  )
}
