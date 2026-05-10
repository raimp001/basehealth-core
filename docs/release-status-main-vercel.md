# Main Merge + Vercel Deployment Status

> **Current status:** None of the Runtime Connectivity Hub, autonomous VM/research/monetization APIs, or payment-verification hardening changes are deployed yet. They exist only in the repository history/branches until `main` is updated and a production deploy succeeds.

This repo currently has only a local `work` branch and no configured git remote in this environment, so an external push/merge cannot be completed from here.

## What was done

- Added `scripts/release-main-and-vercel.sh` to automate:
  1. create local `main` from `work` when missing,
  2. merge `work` into `main`,
  3. run Vercel production deployment.

## Why deployment did not complete in this environment

Attempting to run Vercel deployment failed because package download for `vercel` is blocked by this runtime's package policy:

- `npx vercel --prod --yes`
- error: `403 Forbidden - GET https://registry.npmjs.org/vercel`

## How to push all current changes to `main` (quick guide)

If your latest work is on `work`, run these commands from your own machine (with remote access):

```bash
# 1) ensure your local refs are fresh
git fetch origin

# 2) switch to work and make sure it has the latest commits
git checkout work
git pull --ff-only origin work

# 3) merge work into main locally (script creates main if missing)
bash scripts/release-main-and-vercel.sh

# 4) push updated main to remote
git push origin main
```

If your team requires PRs instead of direct pushes:

```bash
# push work branch updates first
git push origin work
# then open PR: work -> main in GitHub and merge there
```

## What you should do next

If you want this work to stop "going to waste", the safest workflow is:

1. keep doing implementation work on `work`
2. push `work` to GitHub regularly
3. open a **Draft PR** from `work` -> `main` while the feature is still in progress
4. switch the PR from **Draft** to **Ready for review** once:
   - the feature scope is stable,
   - tests pass,
   - deployment notes are clear,
   - you are comfortable shipping it
5. merge that PR into `main`
6. let Vercel deploy from `main` automatically, or manually run a production deploy

## Draft PR vs regular PR

Use a **Draft PR** when:

- you want a backup of the branch on GitHub,
- you want reviewers to see progress early,
- the work is incomplete,
- you do **not** want it merged yet.

Use a **Ready PR** when:

- you are done with the scoped changes,
- CI/test results are acceptable,
- you want approval/merge into `main`,
- you are ready for deployment to production.

## Recommended branch/deploy flow

```text
local work -> push origin/work -> Draft PR -> Ready PR -> merge to main -> Vercel deploys website
```

That is the normal path I would recommend for this repo. Directly pushing to `main` is faster, but a PR is safer because it gives you:

- review history,
- a checklist before merging,
- one place to discuss release risk,
- an audit trail for what actually shipped.

## Practical recommendation for this repo

Because these runtime/payment changes are substantial and are not deployed yet, I recommend:

- create a **Draft PR first** if you are still unsure about readiness,
- use that draft to review the scope and confirm deployment steps,
- convert it to **Ready for review** only after you are comfortable merging to `main`.

If you are the only reviewer and just need a safe shipping workflow, a Draft PR is still useful because it prevents accidental merge pressure while preserving all the work remotely.

## Runbook (in a network-enabled CI or local machine)

```bash
# from repository root
bash scripts/release-main-and-vercel.sh

# if remote is configured, push main
git push origin main
```

## Recommended CI path

- Set up GitHub Actions/Vercel integration to deploy from `main` on merge.
- Keep `work` as staging branch and use PR gating before fast-forwarding to `main`.
