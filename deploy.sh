#!/bin/bash
set -euo pipefail

# Load chris's profile to get pnpm, node, etc. in PATH
export PATH="/home/chris/.local/share/pnpm:$PATH"

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building backend..."
pnpm run build:backend -- --mode production

echo "==> Building frontend..."
sudo chown -R "$USER":"$USER" apps/frontend/dist 2>/dev/null || true
pnpm run build:frontend
chmod -R 755 apps/frontend/dist

echo "==> Restarting PM2..."
pm2 restart ecosystem.config.cjs --update-env

echo "==> Done."
