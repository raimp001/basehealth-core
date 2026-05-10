#!/usr/bin/env bash
set -euo pipefail

# Local release helper:
# 1) Ensure a main branch exists and is updated from work
# 2) Attempt production deployment on Vercel

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "work" && "$CURRENT_BRANCH" != "main" ]]; then
  echo "Run this script from work or main branch. Current: $CURRENT_BRANCH"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/main; then
  echo "Creating local main branch from work"
  git branch main work
fi

git checkout main

# Merge work branch into main (fast-forward where possible)
git merge --ff-only work || git merge --no-edit work

echo "Main is now updated locally at: $(git rev-parse --short HEAD)"

echo "Attempting Vercel production deployment..."
if command -v vercel >/dev/null 2>&1; then
  vercel --prod --yes
else
  npx vercel --prod --yes
fi

echo "Done."
