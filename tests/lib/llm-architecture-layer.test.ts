import { describe, expect, it } from 'vitest'
import { buildLlmArchitectureBlueprint } from '@/lib/llm-architecture-layer'

describe('llm architecture layer', () => {
  it('builds architecture patterns and executable goals', () => {
    const blueprint = buildLlmArchitectureBlueprint({
      objective: 'Optimize CHF follow-up and readmission prevention',
      scope: 'company',
      companyId: 'basehealth',
    })

    expect(blueprint.patterns).toContain('planner-executor')
    expect(blueprint.patterns).toContain('retrieval-augmented')
    expect(blueprint.goals.length).toBeGreaterThanOrEqual(6)
    expect(blueprint.goals[0]?.type).toBe('llm.router.classify_intent')
  })
})
