/*
 * PugInspect service worker.
 *
 * Kept dependency-free on purpose: the only thing it has to get right is
 * never serving a stale app shell, so the strategies are deliberately dull.
 *
 * Bump CACHE_VERSION whenever the strategies below change so old caches are
 * dropped on activate. (Build assets are content-hashed, so ordinary deploys
 * do not need a bump.)
 */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `puginspect-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `puginspect-assets-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

const SHELL_URL = "/";

// Everything the backend renders per-request: proxied through nginx and never
// safe to serve from a cache.
const NETWORK_ONLY = [
  /^\/graphql/,
  /^\/api\//,
  /^\/card\//,
  /^\/meta\//,
  /^\/sitemap\.xml$/,
  /^\/stats\.js$/,
];

/**
 * Precaches the shell plus the build output it references.
 *
 * Filenames are content-hashed, so rather than baking a list into this file at
 * build time we read the freshly fetched shell and pull the URLs out of it.
 * Without this the app would not open offline until its second visit: the
 * worker does not control the page that registered it until it activates, so
 * the entry chunks of the first load are never seen by `fetch`.
 */
async function precacheShell() {
  const shellCache = await caches.open(SHELL_CACHE);
  // `reload` bypasses the HTTP cache so a fresh install never precaches the
  // shell the previous version was already serving.
  const response = await fetch(new Request(SHELL_URL, { cache: "reload" }));
  if (!response.ok) throw new Error(`shell responded ${response.status}`);

  const html = await response.clone().text();
  await shellCache.put(SHELL_URL, response);

  const assets = [...new Set(html.match(/\/assets\/[A-Za-z0-9._-]+/g) ?? [])];
  const assetCache = await caches.open(ASSET_CACHE);
  // One missing asset should not fail the whole install.
  await Promise.all(assets.map((asset) => assetCache.add(asset).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("puginspect-") && !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// The page asks for this when the user accepts an update prompt.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

/** Network-first: keeps the shell fresh online, still opens offline. */
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw error;
  }
}

/** Cache-first: only for content-hashed build output, which never changes. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Stale-while-revalidate: icons, manifest and friends. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await network) ?? Promise.reject(new Error("offline"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NETWORK_ONLY.some((pattern) => pattern.test(url.pathname))) return;

  // SPA navigations all resolve to the same shell, so cache it under one key
  // rather than once per character URL.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, SHELL_URL));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (request.destination === "image" || url.pathname === "/manifest.json") {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});
