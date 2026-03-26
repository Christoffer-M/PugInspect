#!/bin/bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Building and restarting containers..."
docker compose build --pull
docker compose up -d --remove-orphans

echo "==> Done."
