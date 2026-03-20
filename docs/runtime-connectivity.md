# Runtime Connectivity Layer (Seamless Integration)

This note explains how the major runtime layers now connect:

- **VM Runtime** (`autonomous-vm-layer`): executes long-running background goals.
- **Auto Research Layer** (`auto-research-layer`): creates scoped (patient/company) research jobs that start VM sessions.
- **Monetization Layer** (`monetization-opportunity-layer`): captures and ranks business opportunities.
- **Care Snapshot** (`care-orchestration`): now aggregates cross-layer runtime summaries.

## Deployment status

- These runtime connectivity changes are **implemented in code** but are **not deployed** yet.
- Do not assume production availability until `main` is updated and Vercel (or your production target) has a successful deployment.

## What is now connected

`getCareSnapshot(patientId)` includes a `runtime` block with:

- VM session counts by status (`running/completed/failed/stopped`)
- Research job counts by status and scope (`patientScoped/companyScoped`)
- Monetization pipeline counts + top ranked opportunity metadata

This gives a single operational view so product, research, and business layers are not isolated.

## Additional behavioral linkage

When research jobs are paused or completed, the associated VM session is automatically stopped to prevent orphan background loops.

