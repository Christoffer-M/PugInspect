import type { MythicPlusRun, RaidProgress } from "@repo/graphql-types";
import { CURRENT_DUNGEONS, MYTHIC_PLUS_SEASON_SLUGS, RAIDS } from "../../generated/seasonConfig.js";
import type {
  BlizzardKeystoneRun,
  BlizzardKeystoneSeason,
  BlizzardRaidEncounters,
  CharacterProgression,
  StoredMythicPlusSeason,
} from "../services/blizzard/model/Progression.js";

const TIMER_MS = new Map(CURRENT_DUNGEONS.map((d) => [d.challenge_mode_id, d.keystone_timer_seconds * 1000]));

/** Same thresholds as the game: timed is +1, 20% under the timer +2, 40% under +3.
 *  Without a known timer (a dungeon from another season) a timed run counts +1. */
function upgrades(run: BlizzardKeystoneRun): number {
  if (!run.is_completed_within_time) return 0;
  const timer = TIMER_MS.get(run.dungeon.id);
  if (timer && run.duration <= timer * 0.6) return 3;
  if (timer && run.duration <= timer * 0.8) return 2;
  return 1;
}

function mapSeason(season: BlizzardKeystoneSeason | null): StoredMythicPlusSeason | null {
  if (!season) return null;

  // Blizzard lists up to two runs per dungeon (best timed, best overall); keep the higher-rated.
  const best = new Map<number, BlizzardKeystoneRun>();
  for (const run of season.best_runs ?? []) {
    const seen = best.get(run.dungeon.id);
    if (!seen || run.mythic_rating.rating > seen.mythic_rating.rating) best.set(run.dungeon.id, run);
  }
  const runs = [...best.values()].sort((a, b) => b.mythic_rating.rating - a.mythic_rating.rating);

  // Once a season ends Blizzard zeroes mythic_rating but keeps the runs, whose
  // per-dungeon ratings sum to it — to the decimal, live seasons included.
  const rating = season.mythic_rating?.rating || runs.reduce((sum, r) => sum + r.mythic_rating.rating, 0);
  if (!rating) return null;

  return {
    // Null for a season newer than the config (between a season start and
    // `pnpm season:update`): unlabelled beats mislabelled.
    season: MYTHIC_PLUS_SEASON_SLUGS[season.season.id] ?? null,
    rating,
    bestRuns: runs.map(
      (run): MythicPlusRun => ({
        dungeonId: run.dungeon.id,
        dungeon: run.dungeon.name,
        keyLevel: run.keystone_level,
        completedAt: new Date(run.completed_timestamp).toISOString(),
        upgrades: upgrades(run),
        spec: run.members.find((m) => m.character.id === season.character.id)?.specialization.name ?? null,
        url: null,
      })
    ),
  };
}

/**
 * Blizzard reports kills per journal instance; clients key progression by the
 * season config's raid slugs. Each config raid lists the instances it spans
 * (resolved once per season by `pnpm season:update`), so a multi-instance tier
 * is a plain sum. Raids without a kill are omitted.
 */
function mapRaids(raids: BlizzardRaidEncounters): RaidProgress[] {
  // Current raids appear twice (under their expansion and "Current Season");
  // keying by id dedupes them.
  const kills = new Map<number, Map<string, number>>();
  for (const expansion of raids.expansions ?? []) {
    for (const i of expansion.instances) {
      kills.set(i.instance.id, new Map(i.modes.map((m) => [m.difficulty.type, m.progress.completed_count])));
    }
  }

  return Object.entries(RAIDS).flatMap(([raid, { instanceIds, bosses }]) => {
    // Capped: a boss added mid-season would otherwise read 9/8 until the
    // config is regenerated.
    const killed = (difficulty: string) =>
      Math.min(bosses, instanceIds.reduce((sum, id) => sum + (kills.get(id)?.get(difficulty) ?? 0), 0));
    const progress = { raid, normal: killed("NORMAL"), heroic: killed("HEROIC"), mythic: killed("MYTHIC") };
    return progress.normal || progress.heroic || progress.mythic ? [progress] : [];
  });
}

export function mapBlizzardProgression(payloads: {
  currentSeason: BlizzardKeystoneSeason | null;
  previousSeason: BlizzardKeystoneSeason | null;
  raids: BlizzardRaidEncounters;
}): CharacterProgression {
  return {
    mythicPlus: {
      currentSeason: mapSeason(payloads.currentSeason),
      previousSeason: mapSeason(payloads.previousSeason),
    },
    raidProgression: mapRaids(payloads.raids),
  };
}
