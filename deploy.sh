#!/bin/bash
set -euo pipefail

# Where the frontend build lands on the host. A sibling of the checkout, not a
# path under it, so git never sees it and nothing here needs root to create.
RELEASES_DIR="${RELEASES_DIR:-$HOME/puginspect-releases}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-ghcr.io/christoffer-m/puginspect-frontend:${TAG:-latest}}"

# Replace a service without a gap: start the new container alongside the old,
# wait for its healthcheck, then drop the old one. A plain `compose up` stops
# the old container before starting the new one, which left the backend
# unreachable for the whole of node's boot and migrations.
#
# ponytail: compose has no rolling update of its own. The compose-spec field
# for it (deploy.update_config.order: start-first) parses and is then ignored
# by `docker compose up` — verified on v5.5.1, it still logs "Recreate". Swap
# this function for that field if a future compose actually honours it.
#
# Only the backend uses this. The frontend is a long-lived container whose
# files are swapped underneath it (see release_frontend), which is why nothing
# here has to think about two frontends being in rotation at once.
rollout() {
  local svc=$1 old

  # A rollout that died between the scale-up and the stop leaves two
  # containers behind. Left alone that poisons every later deploy: `ps -q`
  # would return two ids, bash would pass them as one argument, and the stop
  # below would fail against a container name that does not exist — after
  # `--scale 2` had already been satisfied by the stale pair, so nothing new
  # would have been deployed. Collapse back to the oldest before starting.
  # read loop rather than mapfile: this has to run under whatever bash the box
  # ships, and mapfile is bash 4+.
  local ids=() line
  while IFS= read -r line; do
    [ -n "$line" ] && ids+=("$line")
  done < <(docker compose ps -q "$svc")
  if [ "${#ids[@]}" -gt 1 ]; then
    echo "    (found ${#ids[@]} $svc containers from an interrupted deploy, cleaning up)"
    docker rm -f "${ids[@]:1}" >/dev/null
  fi
  old="${ids[0]-}"

  # Nothing running yet (first deploy, or the container died) — just bring it up.
  if [ -z "$old" ]; then
    docker compose up -d --no-build --wait --wait-timeout 180 "$svc"
    return
  fi

  # --no-recreate keeps the old container on the old image; the second one is
  # created from the image we just pulled. --wait blocks until it's healthy.
  docker compose up -d --no-build --no-deps --no-recreate --scale "$svc=2" \
    --wait --wait-timeout 180 "$svc"

  docker stop "$old" >/dev/null
  docker rm "$old" >/dev/null

  # Puts the service's desired scale back to 1 so later plain `compose up` calls
  # don't start a second container. No-op against the survivor — compose leaves
  # it running under its existing index rather than renumbering it.
  docker compose up -d --no-build --no-deps --no-recreate --scale "$svc=1" "$svc"
}

# Publish a frontend build by swapping files under the running nginx, rather
# than replacing the container. Nothing is ever out of service: no gap, and no
# window where two versions of the site are in rotation behind nginx-proxy.
release_frontend() {
  local stage cid
  mkdir -p "$RELEASES_DIR/html" "$RELEASES_DIR/assets"

  # Stage inside RELEASES_DIR, not /tmp: the moves below are only atomic while
  # source and destination are on one filesystem. Across filesystems `mv`
  # degrades to copy-then-unlink and a request could catch a half-written file.
  # Sweep anything a previous run left behind before making our own; simpler
  # and more reliable than a trap, which would not fire if the box went down
  # mid-deploy anyway.
  rm -rf "$RELEASES_DIR"/.stage.*
  stage="$(mktemp -d "$RELEASES_DIR/.stage.XXXXXX")"

  # `docker create` makes a container without starting it, purely so docker cp
  # can read the build out. The image is never run.
  cid="$(docker create "$FRONTEND_IMAGE")"
  docker cp "$cid:/dist/." "$stage/"
  docker rm "$cid" >/dev/null

  # Hashed assets first, so the index.html published below can never reference
  # a file that is not on disk yet. -n matters twice over: names are content
  # hashes, so an existing file is already byte-identical and rewriting it
  # would briefly truncate something currently being served; and skipping it
  # preserves its original mtime, which is what the prune below sorts on.
  cp -Rn "$stage/assets/." "$RELEASES_DIR/assets/"

  # Then the unhashed files, one atomic rename each. A request gets the old
  # file or the new one, never a partial one, and either way every asset it
  # points at is already present.
  find "$stage" -maxdepth 1 -type f -exec mv -f {} "$RELEASES_DIR/html/" \;

  # Old builds stay fetchable so a tab opened before a deploy can still load
  # its chunks. 30 days is far past any real session; a few MB per build makes
  # this tens of MB.
  find "$RELEASES_DIR/assets" -type f -mtime +30 -delete

  rm -rf "$stage"
}

main() {
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Images are built and pushed by .github/workflows/deploy.yml; this box only
  # pulls them. TAG is the commit SHA CI built. Without one, deploy :latest (the
  # newest main build); to roll back, pass an older SHA: TAG=<sha> ./deploy.sh
  # That one command rolls back both halves — it re-extracts that build's
  # index.html while its assets are already in the pool. Only roll back past
  # deploys without migrations: the backend migrates on start and nothing
  # migrates back down, so old code would meet the newer schema.
  export TAG="${TAG:-latest}"
  FRONTEND_IMAGE="ghcr.io/christoffer-m/puginspect-frontend:${TAG}"
  export RELEASES_DIR

  echo "==> Pulling latest changes (compose files, nginx config)..."
  git pull origin main

  echo "==> Pulling images ($TAG)..."
  # Only the backend via compose — pulling postgres too would restart the
  # database whenever a new 17.x patch lands, and the frontend service is now
  # stock nginx rather than a per-deploy image.
  docker compose pull backend
  docker pull "$FRONTEND_IMAGE"

  # Before the backend, so the new backend's first fetch of the index.html
  # template (seo/characterMeta.ts) already sees this build.
  echo "==> Publishing frontend release..."
  release_frontend

  echo "==> Rolling out backend..."
  # The new backend runs migrations while the old one is still serving, so a
  # migration must stay readable by the previous release for those few seconds
  # (add a column; don't drop or rename one in the same deploy as the code change).
  rollout backend

  # Converge everything else: postgres, orphans, and the frontend container on
  # the rare deploy that changes nginx.conf or bumps nginx.
  echo "==> Converging the rest of the stack..."
  docker compose up -d --no-build --remove-orphans --wait --wait-timeout 180

  # Every deploy leaves the previous SHA's images behind; drop any not in use.
  # The frontend carrier is unreferenced the moment its build is extracted.
  echo "==> Pruning old images..."
  docker image prune -af --filter label=com.puginspect.image=true

  echo "==> Done."
}

# Sourced by scripts/test-deploy.sh to exercise rollout() and release_frontend()
# against throwaway fixtures; only deploy when run directly. An `if` rather than
# `&&` so sourcing this file doesn't return 1 and trip the caller's `set -e`.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
