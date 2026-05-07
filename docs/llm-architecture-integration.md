# LLM Architecture Integration Layer

This adds architecture patterns inspired by modern LLM system design (router, planner-executor, retrieval augmentation, tool use, reflection, evaluator-optimizer) into the runtime execution flow.

## What is implemented

- New module: `lib/llm-architecture-layer.ts`
  - Defines canonical architecture patterns.
  - Produces an executable blueprint (`goals`) for runtime automation.

- Auto-research integration: `lib/auto-research-layer.ts`
  - Research job goal construction now injects architecture-driven stages before evidence refresh and summary publish.
  - This enables more robust multi-step runs with:
    - intent routing,
    - planning,
    - context refresh,
    - tool execution,
    - reflection,
    - evaluator optimization.

## Why this improves seamlessness

- Runtime jobs become structured, not just linear task lists.
- Research execution gets built-in quality loops (reflection + evaluator).
- Same architecture can be reused for patient-scope and company-scope automations.

