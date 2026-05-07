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
