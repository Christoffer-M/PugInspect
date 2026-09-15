#!/bin/bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

# Images are built and pushed by .github/workflows/deploy.yml; this box only
# pulls them. TAG is the commit SHA CI built. Without one, deploy :latest (the
# newest main build); to roll back, pass an older SHA: TAG=<sha> ./deploy.sh
export TAG="${TAG:-latest}"

echo "==> Pulling latest changes (compose files)..."
git pull origin main

echo "==> Pulling images ($TAG)..."
# Only the app images — pulling postgres too would restart the database
# whenever a new 17.x patch lands.
docker compose pull backend frontend

echo "==> Restarting containers..."
docker compose up -d --no-build --remove-orphans

# Every deploy leaves the previous SHA's images behind; drop any not in use.
echo "==> Pruning old images..."
docker image prune -af --filter label=com.puginspect.image=true

echo "==> Done."
