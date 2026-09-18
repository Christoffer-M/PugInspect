import type { MythicPlusSeason, RaidProgress as RaidKills } from "@repo/graphql-types";
import { DEFAULT_RAID, RAIDS } from "../generated/seasonConfig.js";

export type RaidProgress = {
  killed: number;
  total: number;
  difficulty: "Mythic" | "Heroic" | "Normal";
};

/**
 * Current-tier progress at the highest difficulty the character has a kill on.
 * Kept in sync with getRaidProgressSummary in frontend CharacterHeader.tsx —
 * the og:image card and the crawler HTML must not disagree with the page.
 * Null when the character has no kill in the tier.
 */
export function currentRaidProgress(progression: RaidKills[] | null | undefined): RaidProgress | null {
  const current = progression?.find((p) => p.raid === DEFAULT_RAID);
  if (!current) return null;

  const total = RAIDS[DEFAULT_RAID]?.encounters.length ?? 0;
  if (current.mythic) return { killed: current.mythic, total, difficulty: "Mythic" };
  if (current.heroic) return { killed: current.heroic, total, difficulty: "Heroic" };
  if (current.normal) return { killed: current.normal, total, difficulty: "Normal" };
  return null;
}

/** Highest timed key of the season. Kept in sync with getTopKeyLevel in
 *  frontend CharacterHeader.tsx. */
export function topTimedKey(season: MythicPlusSeason | null | undefined): number | null {
  const levels = season?.bestRuns.filter((r) => r.upgrades > 0).map((r) => r.keyLevel) ?? [];
  return levels.length ? Math.max(...levels) : null;
}
