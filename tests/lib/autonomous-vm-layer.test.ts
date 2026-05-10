import { beforeEach, describe, expect, it, vi } from 'vitest'

const createCareActionMock = vi.fn()

vi.mock('@/lib/care-orchestration', () => ({
  createCareAction: (...args: unknown[]) => createCareActionMock(...args),
  recordCareEvent: vi.fn(),
}))

import {
  getVmSession,
  listVmSessions,
  runVmSchedulerTick,
  startVmSession,
  stopVmSession,
  tickVmSession,
} from '@/lib/autonomous-vm-layer'

describe('autonomous VM layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createCareActionMock.mockResolvedValue({ success: true })
  })

  it('starts a VM session with bounded runtime settings', () => {
    const session = startVmSession({
      name: 'overnight-build',
      durationHours: 10,
      intervalSeconds: 60,
      goals: [{ type: 'care_orchestration.plan_created', payload: { intake: 'build roadmap' } }],
    })

    expect(session.status).toBe('running')
    expect(session.intervalSeconds).toBe(60)
    expect(session.maxRuns).toBeGreaterThan(0)
    expect(getVmSession(session.id)?.id).toBe(session.id)
  })

  it('ticks session and executes goals', async () => {
    const session = startVmSession({
      name: 'nightly',
      durationHours: 1,
      intervalSeconds: 30,
      goals: [
        { type: 'goal.a' },
        { type: 'goal.b', payload: { priority: 'high' } },
      ],
    })

    const updated = await tickVmSession(session.id)
    expect(updated?.runCount).toBe(1)
    expect(createCareActionMock).toHaveBeenCalledTimes(2)
    expect(updated?.status).toMatch(/running|completed|failed/)
  })

  it('stops session and scheduler tick processes active sessions', async () => {
    const active = startVmSession({
      name: 'active',
      goals: [{ type: 'goal.active' }],
    })

    const stopped = startVmSession({
      name: 'stop-me',
      goals: [{ type: 'goal.stop' }],
    })
    stopVmSession(stopped.id)

    const result = await runVmSchedulerTick()

    expect(result.active).toBeGreaterThanOrEqual(1)
    expect(result.sessions.length).toBe(listVmSessions().length)
    expect(getVmSession(active.id)).not.toBeNull()
  })
})
