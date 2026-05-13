#!/usr/bin/env bash
# Server-side redeploy: pull, build, done.
# Triggered by the webhook daemon on every push to master.
# Caddy serves _site/ directly, so no service restart is needed.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/srv/reduxstation/website}"
LOG="${LOG:-/var/log/reduxstation-redeploy.log}"

# Tee everything to a log so you can see what happened after the fact.
exec > >(tee -a "$LOG") 2>&1
echo "----- $(date -u +%FT%TZ) redeploy started -----"

cd "$REPO_DIR"

# Be paranoid about local divergence: master should always equal origin/master.
git fetch origin --prune
git reset --hard origin/master

# Reproducible install matching package-lock.json (if committed) or fresh resolve.
if [ -f package-lock.json ]; then
  npm ci
else
  npm install --no-audit --no-fund
fi

# Build _site/ in place; Caddy roots there and picks up the new files atomically.
npm run build

echo "----- redeploy ok @ $(git rev-parse --short HEAD) -----"
