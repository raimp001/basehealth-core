import { describe, expect, it } from 'vitest'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'

describe('runtime access', () => {
  it('allows only configured admin emails', () => {
    expect(isRuntimeAdmin({ email: 'basehealthapp@gmail.com' })).toBe(true)
    expect(isRuntimeAdmin({ email: 'user@example.com' })).toBe(false)
    expect(isRuntimeAdmin({})).toBe(false)
  })

  it('extracts actor fields safely', () => {
    const actor = getRuntimeActor({ id: 'u1', email: 'basehealthapp@gmail.com' })
    expect(actor).toEqual({ id: 'u1', email: 'basehealthapp@gmail.com' })

    const empty = getRuntimeActor({ id: 123, email: null })
    expect(empty).toEqual({ id: undefined, email: undefined })
  })
})
