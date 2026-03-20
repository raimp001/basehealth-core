import { recordCareEvent } from '@/lib/care-orchestration'

export type MonetizationOpportunityStatus = 'new' | 'accepted' | 'rejected' | 'watching'

export type MonetizationOpportunityInput = {
  title: string
  summary: string
  domain: 'business' | 'market' | 'technology' | 'regulatory' | 'consumer'
  expectedValue: number // 1-10
  executionDifficulty: number // 1-10
  capitalRequired: number // 1-10
  timeHorizonMonths: number
  asymmetryScore: number // 1-10
  monetizationPaths: string[]
}

export type MonetizationOpportunity = MonetizationOpportunityInput & {
  id: string
  createdAt: string
  updatedAt: string
  status: MonetizationOpportunityStatus
  priorityScore: number
}

const opportunities = new Map<string, MonetizationOpportunity>()

function clamp(value: number, min = 1, max = 10) {
  return Math.max(min, Math.min(max, value))
}

function scoreOpportunity(input: MonetizationOpportunityInput): number {
  const ev = clamp(input.expectedValue)
  const asym = clamp(input.asymmetryScore)
  const difficultyPenalty = clamp(input.executionDifficulty)
  const capitalPenalty = clamp(input.capitalRequired)
  const speedBonus = input.timeHorizonMonths <= 6 ? 2 : input.timeHorizonMonths <= 12 ? 1 : 0

  return Number((ev * 2 + asym * 2 + speedBonus - difficultyPenalty * 0.8 - capitalPenalty * 0.6).toFixed(2))
}

export function createMonetizationOpportunity(input: MonetizationOpportunityInput): MonetizationOpportunity {
  const now = new Date().toISOString()
  const opportunity: MonetizationOpportunity = {
    ...input,
    id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    status: 'new',
    priorityScore: scoreOpportunity(input),
  }

  opportunities.set(opportunity.id, opportunity)
  recordCareEvent('monetization.opportunity.created', {
    opportunityId: opportunity.id,
    domain: opportunity.domain,
    priorityScore: opportunity.priorityScore,
  })

  return opportunity
}

export function listMonetizationOpportunities(): MonetizationOpportunity[] {
  return [...opportunities.values()].sort((a, b) => b.priorityScore - a.priorityScore)
}

export function getMonetizationOpportunity(id: string): MonetizationOpportunity | null {
  return opportunities.get(id) || null
}

export function updateMonetizationOpportunityStatus(
  id: string,
  status: MonetizationOpportunityStatus,
): MonetizationOpportunity | null {
  const existing = opportunities.get(id)
  if (!existing) return null

  const updated: MonetizationOpportunity = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  }

  opportunities.set(id, updated)
  recordCareEvent('monetization.opportunity.updated', {
    opportunityId: id,
    status,
    priorityScore: updated.priorityScore,
  })

  return updated
}
