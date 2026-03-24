# Auto-Research Worker

This repo now includes a local-first auto-research layer for BaseHealth, plus an AWS queue path for long-running execution.

## What v1 does

- Persists a `program.md`-style instruction file under `.clawdbot/`
- Persists `settings.json`, run JSON, and markdown reports under `.clawdbot/`
- Runs a bounded analysis loop against the current repo workspace
- Uses OpenClaw first when configured, then falls back to OpenAI or Groq
- Captures git diagnostics and an optional operator-defined evaluation command
- Exposes run history and run detail in `/admin/research`
- Supports an AWS dispatch path using SQS + S3
- Can generate bounded patch artifacts for existing files only
- Can apply a reviewed patch locally when `CLAWDBOT_ALLOW_AUTO_APPLY=true`

## What v1 does not do

- It does not auto-commit to git
- It does not auto-apply patches on Vercel/serverless
- It does not permit arbitrary file creation or unrestricted code modification
- It does not yet provision AWS infrastructure automatically

## Local usage

1. Sign in as an admin.
2. Open `/admin/research`.
3. Save your program/settings.
4. Choose `Local worker` or `AWS queue` as the execution target.
5. If you want code proposals, choose `Generate patch artifacts`.
6. Start one bounded run with a concrete goal.
7. Review the report artifact before making code changes.
8. If a patch artifact was generated and you trust it, apply it locally from the admin UI.

## State layout

Local default:

- `.clawdbot/program.md`
- `.clawdbot/settings.json`
- `.clawdbot/runs/<run-id>.json`
- `.clawdbot/reports/<run-id>.md`
- `.clawdbot/patches/<run-id>.patch`

Remote/Vercel fallback state path is `/tmp/basehealth-clawdbot`, but remote execution is intentionally disabled for the worker loop.

## Controlled code-change execution

Patch generation is intentionally constrained:

- Only existing files are eligible
- Only files under `app/`, `components/`, `docs/`, `lib/`, and `tests/` are patchable
- Patch targets must already exist in the workspace
- Patch generation is capped by `maxPatchFiles`
- Applying a patch is allowed only on local/self-hosted runtimes with `CLAWDBOT_ALLOW_AUTO_APPLY=true`
- Patch application uses `git apply`; failures do not mark the patch as applied

This keeps the research loop reviewable and prevents it from silently mutating the repo.

## AWS worker path

The AWS execution path uses:

- SQS queue for run requests
- S3 for request manifests, run state, reports, and patch artifacts
- ECS/Fargate worker for long-running execution
- CloudWatch Logs for worker output

Required environment variables:

- `AWS_REGION`
- `CLAWDBOT_AWS_SQS_QUEUE_URL`
- `CLAWDBOT_AWS_S3_BUCKET`

Optional AWS environment variables:

- `CLAWDBOT_AWS_S3_PREFIX`
- `CLAWDBOT_AWS_ECS_CLUSTER`
- `CLAWDBOT_AWS_ECS_SERVICE`
- `CLAWDBOT_AWS_ECS_TASK_DEFINITION`
- `CLAWDBOT_AWS_CLOUDWATCH_LOG_GROUP`

Worker commands:

- `npm run autoresearch:worker:aws`
- `npm run autoresearch:worker:aws:once`

The included task-definition template lives at `infra/aws/autoresearch-task-definition.json`.
