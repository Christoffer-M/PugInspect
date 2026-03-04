#!/bin/bash -l
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building..."
sudo chown -R "$USER":"$USER" apps/frontend/dist 2>/dev/null || true
pnpm build
chmod -R 755 apps/frontend/dist

echo "==> Restarting PM2..."
pm2 restart ecosystem.config.cjs --update-env

echo "==> Done."
