#!/bin/bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

# Images are built and pushed by .github/workflows/deploy.yml; this box only
# pulls them. TAG is the commit SHA CI built. Without one, deploy :latest (the
# newest main build); to roll back, pass an older SHA: TAG=<sha> ./deploy.sh
# Only roll back past deploys without migrations: the backend migrates on start
# and nothing migrates back down, so old code would meet the newer schema.
export TAG="${TAG:-latest}"

echo "==> Pulling latest changes (compose files)..."
git pull origin main

echo "==> Pulling images ($TAG)..."
# Only the app images — pulling postgres too would restart the database
# whenever a new 17.x patch lands.
docker compose pull backend frontend

echo "==> Restarting containers..."
# --wait fails the deploy if a container never becomes healthy.
docker compose up -d --no-build --remove-orphans --wait --wait-timeout 180

# Every deploy leaves the previous SHA's images behind; drop any not in use.
echo "==> Pruning old images..."
docker image prune -af --filter label=com.puginspect.image=true

echo "==> Done."
