import { DEFAULT_RAID } from "../generated/seasonConfig.js";
import type { RaidProgression } from "../schema/services/raiderIo/model/CharacterApiResponse.js";

export type RaidProgress = {
  killed: number;
  total: number;
  difficulty: "Mythic" | "Heroic" | "Normal";
};

/**
 * Current-tier progress at the highest difficulty the character has a kill on.
 * Kept in sync with getRaidProgressSummary in frontend CharacterHeader.tsx —
 * the og:image card and the crawler HTML must not disagree with the page.
 * Null when the tier is absent from the snapshot or has no kills at all.
 */
export function currentRaidProgress(
  progression: Record<string, RaidProgression> | null | undefined
): RaidProgress | null {
  const current = progression?.[DEFAULT_RAID];
  if (!current) return null;

  const total = current.total_bosses ?? 0;
  const mythic = current.mythic_bosses_killed ?? 0;
  const heroic = current.heroic_bosses_killed ?? 0;
  const normal = current.normal_bosses_killed ?? 0;

  if (mythic > 0) return { killed: mythic, total, difficulty: "Mythic" };
  if (heroic > 0) return { killed: heroic, total, difficulty: "Heroic" };
  if (normal > 0) return { killed: normal, total, difficulty: "Normal" };
  return null;
}
