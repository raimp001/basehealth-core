import { describe, it, expect } from 'vitest'
import { getCareSnapshot, getRecentCareActions, recordCareEvent } from '@/lib/care-orchestration'

describe('care orchestration recording', () => {
  it('records and returns recent actions newest-first', async () => {
    const actionA = recordCareEvent('test.event.a', { sample: true })
    const actionB = recordCareEvent('test.event.b', { sample: true })

    const recent = getRecentCareActions(2)
    expect(recent).toHaveLength(2)
    expect(recent[0]?.id).toBe(actionB.id)
    expect(recent[1]?.id).toBe(actionA.id)
  })

  it('includes recent actions and runtime summaries in snapshot', async () => {
    recordCareEvent('test.event.snapshot')
    const snapshot = await getCareSnapshot('patient-123')

    expect(Array.isArray(snapshot.recentActions)).toBe(true)
    expect(snapshot.recentActions.length).toBeGreaterThan(0)
    expect(snapshot.runtime.vm.total).toBeGreaterThanOrEqual(0)
    expect(snapshot.runtime.research.total).toBeGreaterThanOrEqual(0)
    expect(snapshot.runtime.monetization.total).toBeGreaterThanOrEqual(0)
  })
})
