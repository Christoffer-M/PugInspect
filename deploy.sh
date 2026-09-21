#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Where the frontend build lands on the host. A sibling of the checkout, not a
# path under it, so git never sees it and nothing here needs root to create.
# docker-compose.yml defaults to the same place (../puginspect-releases,
# resolved against the project directory), so a plain `docker compose up` run
# by hand on the box mounts the real releases directory rather than silently
# creating an empty one and serving 404s for the whole site.
RELEASES_DIR="${RELEASES_DIR:-$(dirname "$REPO_DIR")/puginspect-releases}"
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
#
# Requires the service to publish no host ports: two containers cannot bind the
# same one. main() pins COMPOSE_FILE for exactly that reason.
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
  local stage cid names
  mkdir -p "$RELEASES_DIR/html" "$RELEASES_DIR/assets"
  # Absolute from here on. The mtime refresh below runs `find` from inside the
  # staged assets directory, so a relative pool path would resolve against the
  # wrong place and touch (or fail to touch) the wrong files.
  RELEASES_DIR="$(cd "$RELEASES_DIR" && pwd)"

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

  # Everything below publishes or deletes live files, so refuse to act on a
  # build that plainly isn't one — an image that changed shape would otherwise
  # empty html/ and take the site down.
  if [ ! -f "$stage/index.html" ] || [ ! -d "$stage/assets" ]; then
    echo "refusing to publish: $FRONTEND_IMAGE has no /dist/index.html + /dist/assets" >&2
    return 1
  fi

  # Hashed assets first, so the index.html published below can never reference
  # a file that is not on disk yet.
  #
  # Copy only what's missing: names are content hashes, so a file already in
  # the pool is byte-identical and rewriting it would briefly truncate
  # something being served right now. Deliberately a loop and not `cp -n` —
  # BSD cp exits non-zero when it skips a file, which under `set -e` aborts
  # the deploy on any build that reuses an unchanged chunk.
  #
  # Everything else gets its mtime refreshed, which is what makes the age
  # prune below mean "not shipped in 30 days" rather than "first published 30
  # days ago". Without it a vendor chunk whose hash hasn't moved in a month is
  # deleted while the index.html published seconds later still points at it.
  (cd "$stage/assets" && find . -type f | while IFS= read -r f; do
    mkdir -p "$RELEASES_DIR/assets/$(dirname "$f")"
    if [ -e "$RELEASES_DIR/assets/$f" ]; then
      touch "$RELEASES_DIR/assets/$f"
    else
      cp "$f" "$RELEASES_DIR/assets/$f"
    fi
  done)

  # The build's root-level files, captured before the move empties $stage.
  names="$(find "$stage" -maxdepth 1 -type f -exec basename {} \;)"

  # Then the unhashed files, one atomic rename each. A request gets the old
  # file or the new one, never a partial one, and either way every asset it
  # points at is already present.
  find "$stage" -maxdepth 1 -type f -exec mv -f {} "$RELEASES_DIR/html/" \;

  # Drop whatever the new build no longer ships. Moving only ever adds or
  # overwrites, so without this a prerendered page dropped from PAGES in
  # apps/frontend/scripts/prerender.mjs would keep being served forever by
  # `try_files $uri.html`, old title and canonical included.
  find "$RELEASES_DIR/html" -maxdepth 1 -type f | while IFS= read -r f; do
    grep -qxF "$(basename "$f")" <<<"$names" || rm -f "$f"
  done

  # Old builds stay fetchable so a tab opened before a deploy can still load
  # its chunks. 30 days is far past any real session; a few MB per build makes
  # this tens of MB.
  find "$RELEASES_DIR/assets" -type f -mtime +30 -delete

  rm -rf "$stage"
}

main() {
  cd "$REPO_DIR"

  # Pin the compose file. docker-compose.override.yml is tracked (it publishes
  # ports and makes the proxy network local for dev) and compose would load it
  # automatically here — where `--scale backend=2` cannot bind 4000:4000 twice,
  # and `proxy: external: false` would cut the frontend off from nginx-proxy.
  export COMPOSE_FILE=docker-compose.yml

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

  echo "==> Rolling out backend..."
  # The new backend runs migrations while the old one is still serving, so a
  # migration must stay readable by the previous release for those few seconds
  # (add a column; don't drop or rename one in the same deploy as the code change).
  rollout backend

  # After the backend, not before. Whichever half leads, it serves the other's
  # traffic for a moment, and only this order is the compatible one: a new
  # backend answers the old bundle's queries, while a new bundle asking for a
  # field the old backend has never heard of errors for every visitor. It also
  # means a rollout that fails its healthcheck leaves the old frontend in place
  # rather than stranding a new one against a backend that never arrived.
  #
  # The cost is that the new backend's first index.html fetch (seo/characterMeta.ts)
  # can cache the previous build for up to its 5-minute TTL. Harmless: that
  # template's assets are still in the pool, so the page it serves bots works.
  echo "==> Publishing frontend release..."
  release_frontend

  # Converge everything else: postgres, orphans, and the frontend container on
  # the rare deploy that changes nginx.conf or bumps nginx.
  #
  # This also re-evaluates the backend rollout() just rolled, whose surviving
  # container carries the config hash it was created with under `--scale 2`.
  # Compose v5.5.1 leaves it alone rather than recreating it, which is the only
  # reason a bare `up` is safe here — a recreate would be the stop-then-start
  # gap rollout() exists to avoid. scripts/test-deploy.sh asserts it, so a
  # future compose that changes its mind fails the test rather than the site.
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
