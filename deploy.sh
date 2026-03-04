#!/bin/bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building backend..."
pnpm run build:backend -- --mode production

echo "==> Building frontend..."
pnpm run build:frontend

# Set permissions for Nginx
echo "Setting permissions for frontend..."
sudo chown -R www-data:www-data apps/frontend/dist
sudo chmod -R 755 apps/frontend/dist

echo "==> Restarting PM2..."
pm2 restart ecosystem.config.cjs --update-env

echo "==> Done."
