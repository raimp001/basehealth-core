import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordCareEventMock = vi.fn()

vi.mock('@/lib/care-orchestration', () => ({
  recordCareEvent: (...args: unknown[]) => recordCareEventMock(...args),
}))

import {
  createMonetizationOpportunity,
  getMonetizationOpportunity,
  listMonetizationOpportunities,
  updateMonetizationOpportunityStatus,
} from '@/lib/monetization-opportunity-layer'

describe('monetization opportunity layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and scores opportunities', () => {
    const opportunity = createMonetizationOpportunity({
      title: 'AI prior-auth denial arbitrage tool',
      summary: 'Automate denial analytics and draft clean appeal packets',
      domain: 'business',
      expectedValue: 9,
      executionDifficulty: 4,
      capitalRequired: 3,
      timeHorizonMonths: 6,
      asymmetryScore: 8,
      monetizationPaths: ['SaaS subscriptions', 'enterprise contracts'],
    })

    expect(opportunity.priorityScore).toBeGreaterThan(0)
    expect(getMonetizationOpportunity(opportunity.id)?.id).toBe(opportunity.id)
    expect(recordCareEventMock).toHaveBeenCalled()
  })

  it('sorts opportunities by descending priority and updates status', () => {
    const low = createMonetizationOpportunity({
      title: 'Long-shot niche play',
      summary: 'Small TAM with high execution friction',
      domain: 'market',
      expectedValue: 4,
      executionDifficulty: 8,
      capitalRequired: 8,
      timeHorizonMonths: 24,
      asymmetryScore: 3,
      monetizationPaths: ['ad hoc consulting'],
    })

    const high = createMonetizationOpportunity({
      title: 'Care gap automation platform',
      summary: 'Automated preventive outreach with payer alignment',
      domain: 'technology',
      expectedValue: 9,
      executionDifficulty: 3,
      capitalRequired: 4,
      timeHorizonMonths: 6,
      asymmetryScore: 9,
      monetizationPaths: ['risk-share contracts', 'B2B SaaS'],
    })

    const listed = listMonetizationOpportunities()
    expect(listed[0]?.id).toBe(high.id)

    const updated = updateMonetizationOpportunityStatus(low.id, 'watching')
    expect(updated?.status).toBe('watching')
  })
})
