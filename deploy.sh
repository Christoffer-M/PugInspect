#!/bin/bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Pulling latest changes..."
git pull origin main

# The Umami website id is baked into the frontend bundle at build time; an
# empty value silently disables analytics, so refuse to deploy without it.
if [ -z "${VITE_UMAMI_WEBSITE_ID:-}" ] && ! grep -qE '^VITE_UMAMI_WEBSITE_ID=..*' .env 2>/dev/null; then
  echo "ERROR: VITE_UMAMI_WEBSITE_ID is not set." >&2
  echo "Add it to $DEPLOY_DIR/.env (read by docker compose) or export it before deploying." >&2
  exit 1
fi

echo "==> Building and restarting containers..."
docker compose build --pull
docker compose up -d --remove-orphans

echo "==> Done."
