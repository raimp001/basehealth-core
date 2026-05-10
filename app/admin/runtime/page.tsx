"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, Briefcase, FlaskConical, PlayCircle, RefreshCw, Server, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RuntimeSummary = {
  vm: { total: number; running: number; completed: number; failed: number; stopped: number }
  research: { total: number; active: number; paused: number; completed: number; patientScoped: number; companyScoped: number }
  monetization: {
    total: number
    new: number
    watching: number
    accepted: number
    rejected: number
    topOpportunityId?: string
    topPriorityScore?: number
  }
}

type SnapshotResponse = {
  runtime?: RuntimeSummary
}

type RuntimeApiPayload = {
  success?: boolean
  sessions?: unknown[]
  jobs?: unknown[]
  opportunities?: unknown[]
}

export default function AdminRuntimePage() {
  const [runtime, setRuntime] = useState<RuntimeSummary | null>(null)
  const [extra, setExtra] = useState({ sessions: 0, jobs: 0, opportunities: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningQuickAction, setIsRunningQuickAction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [snapshotRes, vmRes, researchRes, monetizationRes] = await Promise.all([
        fetch('/api/care-orchestration', { cache: 'no-store' }),
        fetch('/api/runtime/vm', { cache: 'no-store' }),
        fetch('/api/runtime/research', { cache: 'no-store' }),
        fetch('/api/runtime/monetization', { cache: 'no-store' }),
      ])

      const snapshot = (await snapshotRes.json()) as SnapshotResponse
      const vm = (await vmRes.json()) as RuntimeApiPayload
      const research = (await researchRes.json()) as RuntimeApiPayload
      const monetization = (await monetizationRes.json()) as RuntimeApiPayload

      if (!snapshot.runtime) {
        setError('Runtime summary is unavailable. You may need admin access.')
      } else {
        setRuntime(snapshot.runtime)
      }

      setExtra({
        sessions: Array.isArray(vm.sessions) ? vm.sessions.length : 0,
        jobs: Array.isArray(research.jobs) ? research.jobs.length : 0,
        opportunities: Array.isArray(monetization.opportunities) ? monetization.opportunities.length : 0,
      })

      setLastRefreshedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to load runtime telemetry')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const healthLabel = useMemo(() => {
    if (!runtime) return 'Unknown'
    if (runtime.vm.failed > 0) return 'Attention needed'
    if (runtime.vm.running > 0 || runtime.research.active > 0) return 'Active'
    return 'Idle'
  }, [runtime])

  const healthPillClass = useMemo(() => {
    if (healthLabel === 'Active') return 'border-emerald-400/40 bg-emerald-100/50 text-emerald-800'
    if (healthLabel === 'Attention needed') return 'border-amber-500/40 bg-amber-100/60 text-amber-900'
    if (healthLabel === 'Idle') return 'border-slate-400/40 bg-slate-100/80 text-slate-700'
    return 'border-border text-muted-foreground'
  }, [healthLabel])

  const runQuickAction = async (kind: 'vm' | 'research' | 'monetization') => {
    setIsRunningQuickAction(true)
    setActionMessage(null)
    setError(null)

    try {
      if (kind === 'vm') {
        const res = await fetch('/api/runtime/vm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'quick-health-check',
            intervalSeconds: 300,
            durationHours: 1,
            goals: [{ type: 'care_orchestration.snapshot_viewed', payload: { source: 'admin-runtime-quick-action' } }],
          }),
        })
        if (!res.ok) throw new Error('Failed to start VM session')
        setActionMessage('Quick VM session started.')
      }

      if (kind === 'research') {
        const res = await fetch('/api/runtime/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'quick-research-scan',
            scope: 'company',
            companyId: 'basehealth',
            objective: 'Identify actionable updates in guidelines and evidence trends',
            cadenceMinutes: 30,
            durationHours: 2,
          }),
        })
        if (!res.ok) throw new Error('Failed to create research job')
        setActionMessage('Quick research job started.')
      }

      if (kind === 'monetization') {
        const res = await fetch('/api/runtime/monetization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Automated denial intelligence service',
            summary: 'Convert denial patterns into payer-specific remediation workflows',
            domain: 'business',
            expectedValue: 8,
            executionDifficulty: 5,
            capitalRequired: 4,
            timeHorizonMonths: 9,
            asymmetryScore: 8,
            monetizationPaths: ['SaaS', 'managed services'],
          }),
        })
        if (!res.ok) throw new Error('Failed to create monetization opportunity')
        setActionMessage('Quick monetization opportunity created.')
      }

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quick action failed')
    } finally {
      setIsRunningQuickAction(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Runtime Connectivity Hub</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unified status for VM sessions, auto-research jobs, and monetization pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs rounded-full border px-2 py-1 ${healthPillClass}`}>
              Health: {healthLabel}
            </span>
            <Button variant="outline" onClick={load} disabled={isLoading || isRunningQuickAction}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <p className="mb-5 text-xs text-muted-foreground">
          Last refreshed: {lastRefreshedAt ?? '—'}
        </p>

        {(error || actionMessage) && (
          <div className="mb-5 space-y-2">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {actionMessage && (
              <div className="rounded-lg border border-emerald-300/40 bg-emerald-100/40 p-4 text-sm text-emerald-700">
                {actionMessage}
              </div>
            )}
          </div>
        )}

        {runtime && (
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Server className="h-4 w-4" /> VM Runtime
              </div>
              <p className="text-2xl font-semibold">{runtime.vm.running}</p>
              <p className="text-xs text-muted-foreground mb-2">running sessions</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total: {runtime.vm.total}</p>
                <p>Completed: {runtime.vm.completed} · Failed: {runtime.vm.failed} · Stopped: {runtime.vm.stopped}</p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <FlaskConical className="h-4 w-4" /> Auto Research
              </div>
              <p className="text-2xl font-semibold">{runtime.research.active}</p>
              <p className="text-xs text-muted-foreground mb-2">active research jobs</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total: {runtime.research.total}</p>
                <p>Patient: {runtime.research.patientScoped} · Company: {runtime.research.companyScoped}</p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" /> Monetization
              </div>
              <p className="text-2xl font-semibold">{runtime.monetization.accepted}</p>
              <p className="text-xs text-muted-foreground mb-2">accepted opportunities</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total: {runtime.monetization.total}</p>
                <p>Top score: {runtime.monetization.topPriorityScore ?? '—'}</p>
              </div>
            </section>
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Run a fast operational check to ensure all runtime layers are connected and responsive.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            <Button variant="outline" onClick={() => runQuickAction('vm')} disabled={isRunningQuickAction}>
              <PlayCircle className="h-4 w-4 mr-2" /> {isRunningQuickAction ? 'Running…' : 'Start VM Check'}
            </Button>
            <Button variant="outline" onClick={() => runQuickAction('research')} disabled={isRunningQuickAction}>
              <PlayCircle className="h-4 w-4 mr-2" /> {isRunningQuickAction ? 'Running…' : 'Start Research Job'}
            </Button>
            <Button variant="outline" onClick={() => runQuickAction('monetization')} disabled={isRunningQuickAction}>
              <PlayCircle className="h-4 w-4 mr-2" /> {isRunningQuickAction ? 'Running…' : 'Add Opportunity'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            API Health Snapshot
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs mb-1">Runtime sessions API</p>
              <p className="font-medium">{extra.sessions} sessions loaded</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs mb-1">Research jobs API</p>
              <p className="font-medium">{extra.jobs} jobs loaded</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs mb-1">Monetization API</p>
              <p className="font-medium">{extra.opportunities} opportunities loaded</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
