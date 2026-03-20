import { beforeEach, describe, expect, it, vi } from 'vitest'

const startVmSessionMock = vi.fn()
const stopVmSessionMock = vi.fn()
const getVmSessionMock = vi.fn()
const recordCareEventMock = vi.fn()

vi.mock('@/lib/autonomous-vm-layer', () => ({
  startVmSession: (...args: unknown[]) => startVmSessionMock(...args),
  stopVmSession: (...args: unknown[]) => stopVmSessionMock(...args),
  getVmSession: (...args: unknown[]) => getVmSessionMock(...args),
}))

vi.mock('@/lib/care-orchestration', () => ({
  recordCareEvent: (...args: unknown[]) => recordCareEventMock(...args),
}))

import {
  completeAutoResearchJob,
  createAutoResearchJob,
  getAutoResearchJob,
  listAutoResearchJobs,
  pauseAutoResearchJob,
} from '@/lib/auto-research-layer'

describe('auto research layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startVmSessionMock.mockReturnValue({ id: 'vm-1', status: 'running' })
    getVmSessionMock.mockReturnValue({ id: 'vm-1', status: 'running', lastRunAt: undefined })
  })

  it('creates patient scoped jobs and starts VM session', () => {
    const { job, vmSession } = createAutoResearchJob({
      name: 'patient gap scan',
      scope: 'patient',
      patientId: 'pt-1',
      objective: 'find care gaps',
      cadenceMinutes: 15,
    })

    expect(vmSession.id).toBe('vm-1')
    expect(job.config.scope).toBe('patient')
    expect(job.config.patientId).toBe('pt-1')
    expect(startVmSessionMock).toHaveBeenCalledTimes(1)
    const vmCall = startVmSessionMock.mock.calls[0]?.[0]
    expect(Array.isArray(vmCall?.goals)).toBe(true)
    expect(vmCall.goals.some((goal: any) => String(goal.type).startsWith('llm.'))).toBe(true)
    expect(recordCareEventMock).toHaveBeenCalled()
  })

  it('supports company scoped jobs and pause/complete transitions', () => {
    const { job } = createAutoResearchJob({
      name: 'company evidence monitor',
      scope: 'company',
      companyId: 'co-1',
      objective: 'monitor evidence updates',
    })

    getVmSessionMock.mockReturnValue({ id: 'vm-1', status: 'stopped', lastRunAt: '2026-01-01T00:00:00.000Z' })
    const paused = pauseAutoResearchJob(job.id)
    expect(paused?.status).toBe('paused')
    expect(stopVmSessionMock).toHaveBeenCalledWith('vm-1')

    const completed = completeAutoResearchJob(job.id, 'published report')
    expect(completed?.status).toBe('completed')
    expect(completed?.notes.at(-1)).toBe('published report')

    expect(getAutoResearchJob(job.id)?.id).toBe(job.id)
    expect(listAutoResearchJobs().length).toBeGreaterThan(0)
  })

  it('rejects invalid scope payloads', () => {
    expect(() =>
      createAutoResearchJob({
        name: 'bad-patient-job',
        scope: 'patient',
        objective: 'x',
      }),
    ).toThrow('patientId is required for patient scope research')

    expect(() =>
      createAutoResearchJob({
        name: 'bad-company-job',
        scope: 'company',
        objective: 'x',
      }),
    ).toThrow('companyId is required for company scope research')
  })
})
