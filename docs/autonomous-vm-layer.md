# Autonomous VM Layer (Overnight Execution)

This module provides a lightweight autonomous runtime that can run healthcare orchestration tasks for hours (e.g., while you're sleeping).

## What it does

- Starts named VM sessions with:
  - duration (hours)
  - run interval (seconds)
  - one or more orchestration goals
- Executes goals through `createCareAction(...)` so existing OpenCloud + care-orchestration logic is reused.
- Tracks execution metadata (`runCount`, `lastRunAt`, `nextRunAt`, status, errors).
- Exposes API control endpoints for status, manual ticks, and stopping sessions.

## API

- `POST /api/runtime/vm`
  - Start a VM session
  - Body:
    ```json
    {
      "name": "overnight-care-optimizer",
      "durationHours": 8,
      "intervalSeconds": 300,
      "goals": [
        { "type": "care_orchestration.plan_created", "payload": { "intake": "optimize screening and follow-up backlog" } },
        { "type": "care_orchestration.snapshot_viewed", "payload": { "patientId": "patient-123" } }
      ]
    }
    ```

- `GET /api/runtime/vm`
  - Runs a scheduler tick and returns all sessions

- `GET /api/runtime/vm/:id`
  - Return a single VM session

- `POST /api/runtime/vm/:id`
  - Manually tick a single VM session

- `DELETE /api/runtime/vm/:id`
  - Stop a running VM session

## Security and observability

- Endpoints require authenticated session (or admin email logic).
- Start/tick/stop/status operations emit audit logs via `createAuditLog`.
- VM runs are also reflected in care orchestration events (`vm.session.*`).

## Intended deployment model

For true long-running execution in production:

1. Keep this control plane as-is.
2. Add a cron/scheduler (or worker) that calls `GET /api/runtime/vm` every minute.
3. Persist sessions to a durable store (DB/Redis) if you need continuity across process restarts.

