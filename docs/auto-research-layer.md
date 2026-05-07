# Auto Research Layer (Patient or Company Scope)

This layer enables continuous autonomous research runs for either:

- a specific patient (`scope: "patient"`), or
- organization-wide/company intelligence (`scope: "company"`).

It is built on top of the VM runtime so research tasks can continue in the background for hours.

## Core capabilities

- Create scoped research jobs with objective + cadence.
- Automatically launch a VM session with research-oriented orchestration goals.
- Track lifecycle (`active`, `paused`, `completed`) and attach notes.
- Expose list/get/update APIs with audit logs.

## API

### Create job
`POST /api/runtime/research`

```json
{
  "name": "overnight-patient-research",
  "scope": "patient",
  "patientId": "pt-123",
  "objective": "monitor emerging studies and guideline updates for HFpEF",
  "cadenceMinutes": 20,
  "durationHours": 8,
  "sources": ["clinical-trials", "guidelines", "papers"]
}
```

Company-wide example:

```json
{
  "name": "company-evidence-monitor",
  "scope": "company",
  "companyId": "basehealth",
  "objective": "track NCCN/USPSTF-like updates relevant to active service lines",
  "cadenceMinutes": 30,
  "durationHours": 12
}
```

### List jobs
`GET /api/runtime/research`

### Get one job
`GET /api/runtime/research/:id`

### Update status
`PATCH /api/runtime/research/:id`

Pause:
```json
{ "action": "pause" }
```

Complete:
```json
{ "action": "complete", "note": "report delivered to ops" }
```

## Integration notes

- Jobs are currently in-memory and should be persisted to DB/Redis for production continuity.
- Pair with scheduled `GET /api/runtime/vm` ticks (cron/worker) for truly unattended overnight operation.
- Each research job launches goals that feed existing orchestration paths (`care_orchestration.plan_created`, `research.evidence_refresh`, `research.summary_publish`).

