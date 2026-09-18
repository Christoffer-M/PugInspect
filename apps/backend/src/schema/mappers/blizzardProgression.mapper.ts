import type { MythicPlusRun, MythicPlusSeason, RaidProgress } from "@repo/graphql-types";
import {
  CURRENT_DUNGEONS,
  DEFAULT_MYTHIC_PLUS_SEASON,
  MYTHIC_PLUS_SEASONS,
  RAIDS,
} from "../../generated/seasonConfig.js";
import type {
  BlizzardKeystoneRun,
  BlizzardKeystoneSeason,
  BlizzardRaidEncounters,
  BlizzardRaidInstance,
  CharacterProgression,
} from "../services/blizzard/model/Progression.js";

const TIMER_MS = new Map(CURRENT_DUNGEONS.map((d) => [d.challenge_mode_id, d.keystone_timer_seconds * 1000]));

// Blizzard names seasons only by id, so the slug (all the UI reads, for its
// "S2" label) comes from the season config, regenerated at every season start.
// ponytail: an expansion's first season has no previous slug here, so its
// previous season shows unlabelled.
const SEASON_SLUGS = { current: DEFAULT_MYTHIC_PLUS_SEASON, previous: Object.keys(MYTHIC_PLUS_SEASONS)[1] ?? null };

const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Same thresholds as the game: timed is +1, 20% under the timer +2, 40% under +3.
 *  Without a known timer (a dungeon from another season) a timed run counts +1. */
function upgrades(run: BlizzardKeystoneRun): number {
  if (!run.is_completed_within_time) return 0;
  const timer = TIMER_MS.get(run.dungeon.id);
  if (timer && run.duration <= timer * 0.6) return 3;
  if (timer && run.duration <= timer * 0.8) return 2;
  return 1;
}

function mapSeason(season: BlizzardKeystoneSeason | null, slug: string | null): MythicPlusSeason | null {
  if (!season) return null;

  // Blizzard lists up to two runs per dungeon (best timed, best overall); keep the higher-rated.
  const best = new Map<number, BlizzardKeystoneRun>();
  for (const run of season.best_runs ?? []) {
    const seen = best.get(run.dungeon.id);
    if (!seen || run.mythic_rating.rating > seen.mythic_rating.rating) best.set(run.dungeon.id, run);
  }
  const runs = [...best.values()].sort((a, b) => b.mythic_rating.rating - a.mythic_rating.rating);

  // Once a season ends Blizzard zeroes mythic_rating (0, transparent white) but
  // keeps the runs, whose per-dungeon ratings sum to it — to the decimal, live
  // seasons included. The colour is gone for good, hence nullable.
  const live = season.mythic_rating?.rating ? season.mythic_rating : undefined;
  const rating = live?.rating ?? runs.reduce((sum, r) => sum + r.mythic_rating.rating, 0);
  if (!rating) return null;

  return {
    season: slug,
    rating,
    color: live ? toHex(live.color) : null,
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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Boss names drift between Raider.IO (where the config's lists come from) and
 *  Blizzard — "Sikran" vs "Sikran, Captain of the Sureki" — so a prefix either
 *  way counts as the same boss. */
function sameBoss(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.startsWith(y) || y.startsWith(x));
}

/**
 * Blizzard reports kills per instance; the clients key progression by the
 * season config's raids. A config raid takes the instance with its exact name;
 * failing that, every unclaimed instance sharing a boss with it — which is how
 * a multi-instance tier (tier-mn-1 = Voidspire + Dreamrift + March on
 * Quel'Danas) sums up. Awakened raids share their bosses with an
 * already-claimed instance and so get nothing: Blizzard doesn't track them apart.
 */
function mapRaids(raids: BlizzardRaidEncounters): RaidProgress[] {
  // Current raids appear twice: under their expansion and under "Current Season".
  const instances = new Map<number, BlizzardRaidInstance>();
  for (const expansion of raids.expansions ?? []) {
    for (const i of expansion.instances) instances.set(i.instance.id, i);
  }
  const byName = new Map([...instances.values()].map((i) => [norm(i.instance.name), i]));
  const claimed = new Set(Object.values(RAIDS).flatMap((r) => byName.get(norm(r.name))?.instance.id ?? []));

  return Object.entries(RAIDS).flatMap(([raid, config]) => {
    const exact = byName.get(norm(config.name));
    const matched = exact
      ? [exact]
      : [...instances.values()].filter(
          (i) =>
            !claimed.has(i.instance.id) &&
            i.modes.some((m) =>
              m.progress.encounters.some((e) => config.encounters.some((b) => sameBoss(b, e.encounter.name)))
            )
        );
    const kills = (type: string) =>
      Math.min(
        config.encounters.length,
        matched.reduce((sum, i) => sum + (i.modes.find((m) => m.difficulty.type === type)?.progress.completed_count ?? 0), 0)
      );
    const progress = { raid, normal: kills("NORMAL"), heroic: kills("HEROIC"), mythic: kills("MYTHIC") };
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
      currentSeason: mapSeason(payloads.currentSeason, SEASON_SLUGS.current),
      previousSeason: mapSeason(payloads.previousSeason, SEASON_SLUGS.previous),
    },
    raidProgression: mapRaids(payloads.raids),
  };
}
