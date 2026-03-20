import { recordCareEvent } from '@/lib/care-orchestration'
import { getVmSession, startVmSession, stopVmSession, type VmGoal, type VmSession } from '@/lib/autonomous-vm-layer'
import { buildLlmArchitectureBlueprint } from '@/lib/llm-architecture-layer'

export type ResearchScope = 'patient' | 'company'
export type ResearchStatus = 'active' | 'paused' | 'completed'

export type AutoResearchConfig = {
  name: string
  scope: ResearchScope
  patientId?: string
  companyId?: string
  objective: string
  cadenceMinutes?: number
  durationHours?: number
  sources?: string[]
}

export type AutoResearchJob = {
  id: string
  createdAt: string
  updatedAt: string
  status: ResearchStatus
  config: AutoResearchConfig
  vmSessionId: string
  vmSessionStatus?: VmSession['status']
  lastRunAt?: string
  notes: string[]
}

const jobs = new Map<string, AutoResearchJob>()

function nowIso() {
  return new Date().toISOString()
}

function ensureValidScope(config: AutoResearchConfig) {
  if (config.scope === 'patient' && !config.patientId) {
    throw new Error('patientId is required for patient scope research')
  }

  if (config.scope === 'company' && !config.companyId) {
    throw new Error('companyId is required for company scope research')
  }
}

function buildGoals(config: AutoResearchConfig): VmGoal[] {
  const sharedPayload = {
    objective: config.objective,
    scope: config.scope,
    patientId: config.patientId,
    companyId: config.companyId,
    sources: config.sources || ['clinical-trials', 'guidelines', 'care-gaps'],
  }

  const architecture = buildLlmArchitectureBlueprint({
    objective: config.objective,
    scope: config.scope,
    patientId: config.patientId,
    companyId: config.companyId,
    sources: sharedPayload.sources,
  })

  return [
    {
      type: 'care_orchestration.plan_created',
      payload: {
        ...sharedPayload,
        intake: `Research objective: ${config.objective}`,
        architecturePatterns: architecture.patterns,
      },
    },
    ...architecture.goals,
    {
      type: 'research.evidence_refresh',
      payload: sharedPayload,
    },
    {
      type: 'research.summary_publish',
      payload: {
        ...sharedPayload,
        architecturePatterns: architecture.patterns,
      },
    },
  ]
}

function withVmState(job: AutoResearchJob): AutoResearchJob {
  const vmSession = getVmSession(job.vmSessionId)
  return {
    ...job,
    vmSessionStatus: vmSession?.status,
    lastRunAt: vmSession?.lastRunAt || job.lastRunAt,
  }
}

export function createAutoResearchJob(config: AutoResearchConfig): { job: AutoResearchJob; vmSession: VmSession } {
  ensureValidScope(config)

  const cadenceMinutes = Number.isFinite(config.cadenceMinutes)
    ? Math.min(120, Math.max(5, Math.floor(config.cadenceMinutes || 30)))
    : 30

  const vmSession = startVmSession({
    name: config.name,
    durationHours: config.durationHours || 8,
    intervalSeconds: cadenceMinutes * 60,
    goals: buildGoals(config),
  })

  const createdAt = nowIso()
  const job: AutoResearchJob = {
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    config,
    vmSessionId: vmSession.id,
    vmSessionStatus: vmSession.status,
    notes: [`Auto research started with ${cadenceMinutes} minute cadence`],
  }

  jobs.set(job.id, job)
  recordCareEvent('research.job.created', {
    researchJobId: job.id,
    vmSessionId: vmSession.id,
    scope: config.scope,
    patientId: config.patientId,
    companyId: config.companyId,
  })

  return { job, vmSession }
}

export function listAutoResearchJobs(): AutoResearchJob[] {
  return [...jobs.values()].map(withVmState).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getAutoResearchJob(id: string): AutoResearchJob | null {
  const job = jobs.get(id)
  if (!job) return null
  return withVmState(job)
}

export function pauseAutoResearchJob(id: string): AutoResearchJob | null {
  const existing = jobs.get(id)
  if (!existing) return null

  stopVmSession(existing.vmSessionId)

  const updated: AutoResearchJob = {
    ...existing,
    status: 'paused',
    updatedAt: nowIso(),
    notes: [...existing.notes, 'Paused by operator'],
  }

  jobs.set(id, updated)
  const hydrated = withVmState(updated)
  recordCareEvent('research.job.paused', { researchJobId: id, vmSessionId: existing.vmSessionId })
  return hydrated
}

export function completeAutoResearchJob(id: string, note?: string): AutoResearchJob | null {
  const existing = jobs.get(id)
  if (!existing) return null

  stopVmSession(existing.vmSessionId)

  const updated: AutoResearchJob = {
    ...existing,
    status: 'completed',
    updatedAt: nowIso(),
    notes: [...existing.notes, note || 'Marked complete'],
  }

  jobs.set(id, updated)
  const hydrated = withVmState(updated)
  recordCareEvent('research.job.completed', { researchJobId: id, vmSessionId: existing.vmSessionId })
  return hydrated
}
