"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CreditCard,
  FileText,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  Wallet,
} from "lucide-react"

import { CareAskPanel } from "@/components/care-ask-panel"

type StoredAppointmentRequest = {
  id: string
  providerName: string
  reason: string
  preferredDate?: string
  urgency?: string
  status?: string
  createdAt: number
}

type StoredScreeningTimelineEntry = {
  id: string
  createdAt: number
  summary?: {
    totalScreenings?: number
    gradeACount?: number
    gradeBCount?: number
    riskLevel?: string
  }
}

const APPT_KEY = "basehealth:appointment-requests"
const SCREENING_TIMELINE_KEY = "basehealth:screening-timeline"

function safeParseLocalArray<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function DashboardClient() {
  const [appointments, setAppointments] = useState<StoredAppointmentRequest[]>([])
  const [screeningEntries, setScreeningEntries] = useState<StoredScreeningTimelineEntry[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAppointments(safeParseLocalArray<StoredAppointmentRequest>(APPT_KEY))
    setScreeningEntries(safeParseLocalArray<StoredScreeningTimelineEntry>(SCREENING_TIMELINE_KEY))
  }, [])

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 3)
  }, [appointments])

  const recentScreening = useMemo(() => {
    return [...screeningEntries]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 3)
  }, [screeningEntries])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your BaseHealth dashboard
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          One ask. The right next step.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Start a clinical question, review screenings due, see your scheduled visits, or settle a copay
          in USDC on Base — all from one place.
        </p>
      </header>

      <section className="mb-8">
        <CareAskPanel compact minimal showLanes={false} />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/screening"
          className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">Screening guide</p>
          <p className="mt-1 text-xs text-muted-foreground">USPSTF Grade A &amp; B for your profile.</p>
        </Link>

        <Link
          href="/providers/search"
          className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between">
            <Stethoscope className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">Find a provider</p>
          <p className="mt-1 text-xs text-muted-foreground">In-network and verified clinicians.</p>
        </Link>

        <Link
          href="/appointments"
          className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between">
            <CalendarClock className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">Visit requests</p>
          <p className="mt-1 text-xs text-muted-foreground">Pending and scheduled appointments.</p>
        </Link>

        <Link
          href="/wallet"
          className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between">
            <Wallet className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">Base receipts</p>
          <p className="mt-1 text-xs text-muted-foreground">USDC payments and on-chain audit log.</p>
        </Link>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Recent visit requests</h2>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-primary transition-colors hover:underline"
            >
              View all
            </Link>
          </div>

          {!mounted ? (
            <div className="mt-3 h-20 animate-pulse rounded-lg bg-muted/30" />
          ) : recentAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No requests yet. Start with a screening recommendation or a chat conversation to draft one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentAppointments.map((appt) => (
                <li
                  key={appt.id}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-foreground">{appt.providerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {appt.reason || "Visit request"}
                    {appt.urgency ? ` • ${appt.urgency}` : ""}
                    {appt.status ? ` • ${appt.status}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(appt.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Recent screening assessments</h2>
            </div>
            <Link
              href="/screening"
              className="text-xs font-semibold text-primary transition-colors hover:underline"
            >
              Run new
            </Link>
          </div>

          {!mounted ? (
            <div className="mt-3 h-20 animate-pulse rounded-lg bg-muted/30" />
          ) : recentScreening.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No saved assessments yet. Run a screening assessment to get USPSTF Grade A &amp; B
              recommendations.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentScreening.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {entry.summary?.totalScreenings ?? 0} recommendations
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grade A: {entry.summary?.gradeACount ?? 0} • Grade B:{" "}
                    {entry.summary?.gradeBCount ?? 0} • Risk: {entry.summary?.riskLevel ?? "n/a"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        <Link
          href="/payment/base"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <CreditCard className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">Pay on Base</p>
          <p className="mt-1 text-xs text-muted-foreground">USDC presets for screening, copay, and telemedicine.</p>
        </Link>
        <Link
          href="/medical-records"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <FileText className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">Medical records</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect Apple Health or upload PDFs.</p>
        </Link>
        <Link
          href="/emergency"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm transition-colors hover:bg-destructive/10"
        >
          <HeartPulse className="h-5 w-5 text-destructive" />
          <p className="mt-3 text-sm font-semibold text-destructive">Emergency triage</p>
          <p className="mt-1 text-xs text-muted-foreground">Red-flag symptoms? Call 911 or use ER triage.</p>
        </Link>
      </section>
    </main>
  )
}
