#!/usr/bin/env bash
# Manual deploy script.
# Auto-deploy runs on every push to master via .github/workflows/deploy.yml;
# use this script for staging tests, hotfixes, or recovery when CI is unavailable.
#
# Usage:
#   REDUX_HOST=deploy-user@reduxstation.com ./deploy.sh
#   REDUX_HOST=deploy-user@reduxstation.com REMOTE_DIR=/var/www/reduxstation-staging ./deploy.sh

set -euo pipefail

HOST="${REDUX_HOST:?set REDUX_HOST=user@reduxstation.com}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/reduxstation}"

echo "Building..."
npm ci
npm run build

echo "Rsyncing _site/ -> $HOST:$REMOTE_DIR"
rsync -avz --delete \
  --exclude '.DS_Store' \
  _site/ "$HOST:$REMOTE_DIR/"

echo "Done. Caddy serves files live; no reload needed for content changes."
