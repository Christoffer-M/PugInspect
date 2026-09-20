/**
 * Characters Blizzard answers 404 for, remembered so the next page view doesn't
 * ask all six endpoints again. Without this one name burned ~120 upstream 404s
 * over two days: a 404 is never persisted as a snapshot, so every visit was a
 * cache miss and a full fan-out.
 *
 * In-process and short-lived on purpose. A transfer, a rename or a fresh level-1
 * makes a real character 404 for a while, so this must expire on its own; an
 * explicit refresh (bypassCache) and a restart both clear it immediately.
 */

const TTL_MS = 6 * 60 * 60 * 1000;
// ponytail: a Map with a size cap, not an LRU — entries are ~60 bytes and expire
// on their own. Swap in a real cache only if something starts enumerating names.
const MAX_ENTRIES = 10_000;

const missing = new Map<string, number>();

export function characterKey(region: string, realm: string, name: string): string {
  return `${region.toLowerCase()}:${realm}:${name.toLowerCase()}`;
}

export function isMissingCharacter(key: string): boolean {
  const expiresAt = missing.get(key);
  if (expiresAt === undefined) return false;
  if (Date.now() < expiresAt) return true;
  missing.delete(key);
  return false;
}

export function markMissingCharacter(key: string): void {
  if (missing.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, expiresAt] of missing) if (expiresAt <= now) missing.delete(k);
    // Still full: everything is live, so drop the oldest insert to stay bounded.
    if (missing.size >= MAX_ENTRIES) missing.delete(missing.keys().next().value!);
  }
  missing.set(key, Date.now() + TTL_MS);
}

/** Test seam — production never needs to forget early. */
export function clearMissingCharacters(): void {
  missing.clear();
}
