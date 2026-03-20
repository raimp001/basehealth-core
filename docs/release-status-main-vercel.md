# Main Merge + Vercel Deployment Status

> **Current status:** None of the Runtime Connectivity Hub, autonomous VM/research/monetization APIs, or payment-verification hardening changes are deployed yet. They exist only in the repository history/branches until `main` is updated and a production deploy succeeds.

This repo currently has only a local `work` branch and no configured git remote in this environment, so an external push/merge cannot be completed from here.

That means the current runtime/payment work is presently **stuck in this local git history** until it is pushed to a hosted repo and merged there.

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

## If you are coding from your phone

If you are mostly working from your phone and cannot run git locally, then your next steps should happen in **GitHub's web UI or mobile app**, not on-device shell commands.

Recommended phone-first workflow:

1. get this branch pushed to GitHub somehow (from a trusted machine, Codespace, or repo-connected cloud workspace)
2. confirm the branch name is `work`
3. open GitHub in your browser/app
4. create a **Draft Pull Request** from `work` into `main`
5. review the changed files in the PR
6. when ready, mark the PR **Ready for review**
7. merge the PR into `main`
8. confirm Vercel is configured to deploy from `main`
9. check the Vercel deployment status page

### Important reality check

Because there is **no git remote configured in this environment**, I cannot directly push this branch to GitHub or merge it into your hosted `main` from here. What I *can* do is keep organizing the code, commit it cleanly, and give you the exact branch/PR workflow to use once the repo is connected to GitHub.

### Best next action

Your best next action is:

- connect this repo/workspace to the real GitHub repository, or
- open the same repo in GitHub Codespaces / another cloud IDE that has the remote configured, or
- have a trusted machine push the `work` branch once, after which you can manage the PR from your phone.

Once the `work` branch exists on GitHub, doing the rest from your phone becomes much easier because you can:

- open the Draft PR,
- comment/review,
- mark it Ready,
- merge to `main`,
- watch the Vercel deploy.

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
