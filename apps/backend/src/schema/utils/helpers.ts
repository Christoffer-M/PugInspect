import { REALM_SLUGS } from "../../generated/realmSlugs.js";
import { Difficulty, InputMaybe, Metric } from "@repo/graphql-types";

const VALID_METRICS = new Set<Metric>(["dps", "hps", "points_and_damage", "points_and_healing"]);

/** Returns the metric only if it is a currently valid Metric enum value, otherwise null. */
export function sanitizeMetric(value: unknown): Metric | null {
  return typeof value === "string" && VALID_METRICS.has(value as Metric)
    ? (value as Metric)
    : null;
}

/** Canonical WoW realm slug: lowercase, apostrophes/parens removed, spaces → dashes, dashes collapsed.
 * Diacritics are preserved — "Aggra (Português)" → "aggra-português", the slug form Blizzard,
 * RaiderIO, and WarcraftLogs all accept (RaiderIO rejects the ASCII-folded "aggra-portugues"). */
export function normalizeRealm(realm: string): string {
  return realm
    .trim()
    .toLowerCase()
    .replace(/[''`()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Lookup key for REALM_SLUGS: lowercased, every separator stripped, so
 * "Der Rat von Dalaran", "DerRatvonDalaran" and "der-rat-von-dalaran" all land
 * on one entry. Mirrors squashRealm in packages/ui/src/realmKey.ts — the two
 * must derive keys identically or every lookup misses. */
function squashRealm(realm: string): string {
  return realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Resolve any realm a client sends to Blizzard's own slug.
 *
 * normalizeRealm below only reformats punctuation, so it turns the
 * Blizzard-normalized form clients sometimes send ("TarrenMill") into
 * "tarrenmill" — which every upstream 404s. RaiderIO is lenient enough to
 * answer some of them anyway, and that answer is what persists the bad realm
 * as its own `characters` row and publishes it to the sitemap. So resolve
 * here, at the boundary, and let everything downstream assume a real slug.
 *
 * Unknown realms fall through to normalizeRealm rather than being rejected:
 * the table is only as fresh as the last deploy, and a realm opened since then
 * is exactly when a real user is looking up a real character. isKnownRealm
 * marks those as unvouched-for so the sitemap can decline to publish them.
 */
export function resolveRealm(realm: string, region: string): string {
  return (
    REALM_SLUGS[region.toLowerCase()]?.[squashRealm(realm)] ?? normalizeRealm(realm)
  );
}

/** Whether a realm resolves to a slug Blizzard actually publishes. */
export function isKnownRealm(realm: string, region: string): boolean {
  return REALM_SLUGS[region.toLowerCase()]?.[squashRealm(realm)] !== undefined;
}

/** Canonical character name: lowercase, trimmed. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Coalesce concurrent identical upstream fetches: callers with the same key
 *  share one promise (same pattern as WCL's profileFetchInFlight). Joining is
 *  always safe — an in-flight entry is a real upstream fetch, never a cache hit. */
export function dedupeInFlight<T>(
  map: Map<string, Promise<T>>,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const promise = fn().finally(() => map.delete(key));
  map.set(key, promise);
  return promise;
}

/** Start a wall-clock timer; call the result for elapsed milliseconds.
 *  Upstream log lines carry this as `durationMs`, so latency per service can be
 *  read straight off the logs (filter for durationMs, group by service) instead
 *  of being guessed at. */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

export const mapDifficultyIdToName = (
  difficulty?: number | InputMaybe<number>
): Difficulty | null => {
  switch (difficulty) {
    case 1:
      return "LFR";
    case 3:
      return "Normal";
    case 4:
      return "Heroic";
    case 5:
      return "Mythic";
    default:
      return null;
  }
};

export function mapEncounter(
  encounter: { id?: number; name?: string } | undefined
): { id: number; name: string } | null {
  return encounter &&
    typeof encounter.id === "number" &&
    typeof encounter.name === "string"
    ? { id: encounter.id, name: encounter.name }
    : null;
}

export function toFixedNumber(
  value: number | undefined,
  digits = 2
): number | null {
  return typeof value === "number" ? parseFloat(value.toFixed(digits)) : null;
}
