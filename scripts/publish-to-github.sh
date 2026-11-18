#!/usr/bin/env bash
# Run locally after extracting the project ZIP. Requires an authenticated GitHub CLI.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${1:-arupm23/biosecurity-signals-v2}"
if ! command -v git >/dev/null; then echo "Install git first" >&2; exit 1; fi
if ! command -v gh >/dev/null; then echo "Install GitHub CLI (https://cli.github.com/) and run: gh auth login" >&2; exit 1; fi
if ! gh auth status >/dev/null 2>&1; then echo "Authenticate first: gh auth login" >&2; exit 1; fi
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ROOT="$(git rev-parse --show-toplevel)"
  if [ "$ROOT" != "$PWD" ]; then
    echo 'Refusing to commit inside a parent repository. Extract this project outside another Git checkout.' >&2
    exit 1
  fi
else
  git init -b main
fi
if [ "$(git branch --show-current)" != "main" ]; then
  echo 'Please publish from a local main branch to avoid overwriting existing branches.' >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "Initial release: Biosecurity Signals v2 evidence observatory"
fi
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "$REPO already exists. Refusing to overwrite an existing remote repository." >&2
  exit 1
fi
gh repo create "$REPO" --public --source=. --remote=origin --push \
  --description "Source-linked public evidence observatory for AI-biology safeguards"
echo "Created and pushed: https://github.com/$REPO"
echo 'Next: enable Pages from main / root and configure your own Supabase project (README.md).'
