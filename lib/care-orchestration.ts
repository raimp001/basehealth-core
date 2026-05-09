export type NetworkPartner = {
  id: string
  name: string
  type: "pharmacy" | "lab" | "imaging"
  address: string
  phone: string
  acceptsEScripts?: boolean
  turnaround?: string
}

export type BillingReceipt = {
  id: string
  patientId: string
  amountUsd: number
  status: "paid" | "pending"
  description: string
  createdAt: string
}

export type PriorAuthItem = {
  id: string
  patientId: string
  medicationOrService: string
  status: "draft" | "submitted" | "approved"
  payer: string
}

export type ClinicalUpdate = {
  id: string
  title: string
  summary: string
  audience: "patient" | "provider"
  publishedAt: string
}

export type OpenCloudAgentStatus = {
  enabled: boolean
  version: string
  capabilities: string[]
}

export type CareActionLogEntry = {
  id: string
  type: string
  createdAt: string
  payload?: Record<string, unknown>
  openCloudResult?: string
  routedTasks?: number
}

export type RuntimeConnectionSummary = {
  vm: {
    total: number
    running: number
    completed: number
    failed: number
    stopped: number
  }
  research: {
    total: number
    active: number
    paused: number
    completed: number
    patientScoped: number
    companyScoped: number
  }
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

export type CareSnapshot = {
  partners: NetworkPartner[]
  priorAuth: PriorAuthItem[]
  receipts: BillingReceipt[]
  updates: ClinicalUpdate[]
  openCloud: OpenCloudAgentStatus
  agents: { enabled: boolean; total: number; roles: string[] }
  recentActions: CareActionLogEntry[]
  runtime: RuntimeConnectionSummary
}

import { getOpenCloudStatus, runOpenCloudTask } from "@/lib/opencloud-agent"
import { CARE_AGENTS, buildAgentPlan } from "@/lib/agent-mesh"
import { listVmSessions } from '@/lib/autonomous-vm-layer'
import { listAutoResearchJobs } from '@/lib/auto-research-layer'
import { listMonetizationOpportunities } from '@/lib/monetization-opportunity-layer'

const ACTION_LOG: CareActionLogEntry[] = []
const MAX_ACTION_LOG_ENTRIES = 500

function appendAction(entry: CareActionLogEntry) {
  ACTION_LOG.push(entry)
  if (ACTION_LOG.length > MAX_ACTION_LOG_ENTRIES) ACTION_LOG.shift()
}

function getRuntimeConnectionSummary(patientId?: string): RuntimeConnectionSummary {
  const vmSessions = listVmSessions()
  const researchJobs = listAutoResearchJobs().filter((job) => {
    if (!patientId) return true
    if (job.config.scope === 'company') return true
    return job.config.patientId === patientId
  })
  const opportunities = listMonetizationOpportunities()

  const topOpportunity = opportunities[0]

  return {
    vm: {
      total: vmSessions.length,
      running: vmSessions.filter((session) => session.status === 'running').length,
      completed: vmSessions.filter((session) => session.status === 'completed').length,
      failed: vmSessions.filter((session) => session.status === 'failed').length,
      stopped: vmSessions.filter((session) => session.status === 'stopped').length,
    },
    research: {
      total: researchJobs.length,
      active: researchJobs.filter((job) => job.status === 'active').length,
      paused: researchJobs.filter((job) => job.status === 'paused').length,
      completed: researchJobs.filter((job) => job.status === 'completed').length,
      patientScoped: researchJobs.filter((job) => job.config.scope === 'patient').length,
      companyScoped: researchJobs.filter((job) => job.config.scope === 'company').length,
    },
    monetization: {
      total: opportunities.length,
      new: opportunities.filter((item) => item.status === 'new').length,
      watching: opportunities.filter((item) => item.status === 'watching').length,
      accepted: opportunities.filter((item) => item.status === 'accepted').length,
      rejected: opportunities.filter((item) => item.status === 'rejected').length,
      topOpportunityId: topOpportunity?.id,
      topPriorityScore: topOpportunity?.priorityScore,
    },
  }
}

export function recordCareEvent(type: string, payload?: Record<string, unknown>): CareActionLogEntry {
  const action = {
    id: `act-${Date.now()}`,
    type,
    createdAt: new Date().toISOString(),
    payload,
  }

  appendAction(action)
  return action
}

export function getRecentCareActions(limit = 25): CareActionLogEntry[] {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 25
  return ACTION_LOG.slice(-normalizedLimit).reverse()
}

export async function getCareSnapshot(patientId?: string): Promise<CareSnapshot> {
  return {
    partners: [],
    priorAuth: [],
    receipts: [],
    updates: [],
    openCloud: getOpenCloudStatus(),
    agents: {
      enabled: true,
      total: CARE_AGENTS.length,
      roles: [...new Set(CARE_AGENTS.map((agent) => agent.role))],
    },
    recentActions: getRecentCareActions(20),
    runtime: getRuntimeConnectionSummary(patientId),
  }
}

export async function createCareAction(type: string, payload?: Record<string, unknown>) {
  const safePayload = payload || {}
  const intake = typeof safePayload.intake === "string" ? safePayload.intake : type
  const routedPlan = buildAgentPlan(intake)

  const openCloud = await runOpenCloudTask(type, {
    ...safePayload,
    routedPlan,
  })

  const action = {
    id: `act-${Date.now()}`,
    type,
    createdAt: new Date().toISOString(),
    payload: safePayload,
    openCloudResult: openCloud.message,
    routedTasks: routedPlan.tasks.length,
  }

  appendAction(action)
  return { ...action, openCloud, routedPlan }
}
