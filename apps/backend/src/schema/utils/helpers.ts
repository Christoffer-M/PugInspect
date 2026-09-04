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
