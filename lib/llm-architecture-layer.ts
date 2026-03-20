export type LlmArchitecturePattern =
  | 'router'
  | 'planner-executor'
  | 'retrieval-augmented'
  | 'tool-use'
  | 'reflection'
  | 'evaluator-optimizer'

export interface ArchitectureGoalTemplateInput {
  objective: string
  scope: 'patient' | 'company'
  patientId?: string
  companyId?: string
  sources?: string[]
}

export interface ArchitectureGoalTemplate {
  type: string
  payload: Record<string, unknown>
}

export interface LlmArchitectureBlueprint {
  patterns: LlmArchitecturePattern[]
  goals: ArchitectureGoalTemplate[]
}

const DEFAULT_PATTERNS: LlmArchitecturePattern[] = [
  'router',
  'planner-executor',
  'retrieval-augmented',
  'tool-use',
  'reflection',
  'evaluator-optimizer',
]

export function buildLlmArchitectureBlueprint(input: ArchitectureGoalTemplateInput): LlmArchitectureBlueprint {
  const shared = {
    objective: input.objective,
    scope: input.scope,
    patientId: input.patientId,
    companyId: input.companyId,
    sources: input.sources || ['clinical-trials', 'guidelines', 'claims-analytics'],
  }

  const goals: ArchitectureGoalTemplate[] = [
    {
      type: 'llm.router.classify_intent',
      payload: {
        ...shared,
        pattern: 'router',
      },
    },
    {
      type: 'llm.planner.generate_workplan',
      payload: {
        ...shared,
        pattern: 'planner-executor',
        intake: `Plan multi-step execution for objective: ${input.objective}`,
      },
    },
    {
      type: 'llm.retrieval.refresh_context',
      payload: {
        ...shared,
        pattern: 'retrieval-augmented',
      },
    },
    {
      type: 'llm.tools.execute',
      payload: {
        ...shared,
        pattern: 'tool-use',
      },
    },
    {
      type: 'llm.reflection.critique',
      payload: {
        ...shared,
        pattern: 'reflection',
      },
    },
    {
      type: 'llm.evaluator.score_and_optimize',
      payload: {
        ...shared,
        pattern: 'evaluator-optimizer',
      },
    },
  ]

  return {
    patterns: DEFAULT_PATTERNS,
    goals,
  }
}
