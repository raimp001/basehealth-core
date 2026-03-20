import { createCareAction, recordCareEvent } from '@/lib/care-orchestration'

export type VmGoal = {
  type: string
  payload?: Record<string, unknown>
}

export type VmSessionStatus = 'running' | 'stopped' | 'completed' | 'failed'

export type VmSession = {
  id: string
  name: string
  createdAt: string
  startedAt: string
  endsAt: string
  status: VmSessionStatus
  intervalSeconds: number
  lastRunAt?: string
  nextRunAt: string
  runCount: number
  maxRuns: number
  goals: VmGoal[]
  lastError?: string
}

const sessions = new Map<string, VmSession>()

function iso(ms: number) {
  return new Date(ms).toISOString()
}

function nowMs() {
  return Date.now()
}

export function listVmSessions(): VmSession[] {
  return [...sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getVmSession(id: string): VmSession | null {
  return sessions.get(id) || null
}

export function stopVmSession(id: string): VmSession | null {
  const session = sessions.get(id)
  if (!session) return null

  const updated: VmSession = {
    ...session,
    status: 'stopped',
  }

  sessions.set(id, updated)
  recordCareEvent('vm.session.stopped', { sessionId: id, runCount: updated.runCount })
  return updated
}

export function startVmSession(input: {
  name: string
  durationHours?: number
  intervalSeconds?: number
  goals: VmGoal[]
}): VmSession {
  const durationHours = Number.isFinite(input.durationHours) ? Math.min(24, Math.max(1, Math.floor(input.durationHours || 1))) : 8
  const intervalSeconds = Number.isFinite(input.intervalSeconds)
    ? Math.min(3600, Math.max(30, Math.floor(input.intervalSeconds || 300)))
    : 300

  const createdMs = nowMs()
  const maxRuns = Math.max(1, Math.floor((durationHours * 3600) / intervalSeconds))

  const session: VmSession = {
    id: `vm-${createdMs}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    createdAt: iso(createdMs),
    startedAt: iso(createdMs),
    endsAt: iso(createdMs + durationHours * 3600_000),
    status: 'running',
    intervalSeconds,
    nextRunAt: iso(createdMs),
    runCount: 0,
    maxRuns,
    goals: input.goals,
  }

  sessions.set(session.id, session)
  recordCareEvent('vm.session.started', {
    sessionId: session.id,
    name: session.name,
    intervalSeconds,
    maxRuns,
    goalCount: session.goals.length,
  })

  return session
}

async function runGoals(session: VmSession): Promise<{ successCount: number; failureCount: number; firstError?: string }> {
  let successCount = 0
  let failureCount = 0
  let firstError: string | undefined

  for (const goal of session.goals) {
    try {
      await createCareAction(goal.type, {
        ...(goal.payload || {}),
        vmSessionId: session.id,
        vmSessionName: session.name,
        vmRunCount: session.runCount + 1,
      })
      successCount += 1
    } catch (error) {
      failureCount += 1
      if (!firstError) {
        firstError = error instanceof Error ? error.message : 'Unknown VM execution error'
      }
    }
  }

  return { successCount, failureCount, firstError }
}

export async function tickVmSession(id: string): Promise<VmSession | null> {
  const session = sessions.get(id)
  if (!session) return null
  if (session.status !== 'running') return session

  const now = nowMs()
  if (now < new Date(session.nextRunAt).getTime()) return session

  const { failureCount, firstError } = await runGoals(session)
  const runCount = session.runCount + 1
  const hardStop = now >= new Date(session.endsAt).getTime() || runCount >= session.maxRuns
  const status: VmSessionStatus = hardStop ? (failureCount > 0 ? 'failed' : 'completed') : 'running'

  const updated: VmSession = {
    ...session,
    runCount,
    lastRunAt: iso(now),
    nextRunAt: iso(now + session.intervalSeconds * 1000),
    status,
    lastError: firstError,
  }

  sessions.set(id, updated)
  recordCareEvent('vm.session.tick', {
    sessionId: id,
    runCount,
    status,
    failureCount,
  })

  return updated
}

export async function runVmSchedulerTick(): Promise<{ processed: number; active: number; sessions: VmSession[] }> {
  const all = listVmSessions()
  const active = all.filter((session) => session.status === 'running')

  let processed = 0
  for (const session of active) {
    const before = session.runCount
    const updated = await tickVmSession(session.id)
    if (updated && updated.runCount > before) processed += 1
  }

  return {
    processed,
    active: active.length,
    sessions: listVmSessions(),
  }
}
