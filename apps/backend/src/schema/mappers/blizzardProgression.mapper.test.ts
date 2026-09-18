import { describe, expect, it } from "vitest";
import { mapBlizzardProgression } from "./blizzardProgression.mapper.js";
import type { BlizzardKeystoneRun, BlizzardRaidInstance } from "../services/blizzard/model/Progression.js";

// Trimmed from a live EU character (Sept 2026), with Raider.IO's answer for the
// same character as the expected values.
const ME = 213842854;
const run = (dungeonId: number, name: string, level: number, timed: boolean, durationS: number, rating: number): BlizzardKeystoneRun => ({
  completed_timestamp: 1788009481000,
  duration: durationS * 1000,
  keystone_level: level,
  is_completed_within_time: timed,
  dungeon: { id: dungeonId, name },
  mythic_rating: { rating },
  members: [
    { character: { id: 1 }, specialization: { name: "Blood" } },
    { character: { id: ME }, specialization: { name: "Devourer" } },
  ],
});
const instance = (id: number, kills: Record<string, number>): BlizzardRaidInstance => ({
  instance: { id },
  modes: Object.entries(kills).map(([type, completed_count]) => ({ difficulty: { type }, progress: { completed_count } })),
});
// Journal ids as the season config maps them: tier-mn-1 = 1314 + 1307 + 1308.
const midnight = [
  instance(1307, { NORMAL: 6, HEROIC: 6, MYTHIC: 6 }), // The Voidspire
  instance(1314, { NORMAL: 1, HEROIC: 1, MYTHIC: 1 }), // The Dreamrift
  instance(1308, { NORMAL: 2, HEROIC: 2 }), // March on Quel'Danas
  instance(1320, { NORMAL: 8, HEROIC: 7 }), // The Venomous Abyss
];

describe("mapBlizzardProgression", () => {
  const { mythicPlus, raidProgression } = mapBlizzardProgression({
    currentSeason: {
      season: { id: 18 },
      character: { id: ME },
      mythic_rating: { rating: 3179.455 },
      best_runs: [
        run(249, "Kings' Rest", 15, false, 2630, 307.7),
        run(249, "Kings' Rest", 14, true, 1583, 402.5),
        run(588, "Altar of Fangs", 14, true, 1473, 401.8),
      ],
    },
    // Ended season: Blizzard zeroes the rating but keeps the runs.
    previousSeason: {
      season: { id: 17 },
      character: { id: ME },
      mythic_rating: { rating: 0 },
      best_runs: [run(249, "Kings' Rest", 14, true, 1583, 402.5), run(588, "Altar of Fangs", 14, false, 1900, 301.8)],
    },
    raids: {
      expansions: [
        { instances: midnight }, // "Current Season"
        { instances: midnight }, // Midnight — the same instances again
        { instances: [instance(1207, { MYTHIC: 9 }), instance(9999, { NORMAL: 3 })] }, // Amirdrassil + one the config doesn't list
      ],
    },
  });

  it("keeps the highest-rated run per dungeon, with the character's own spec", () => {
    expect(mythicPlus.currentSeason).toMatchObject({ season: "season-mn-2", rating: 3179.455 });
    expect(mythicPlus.currentSeason).not.toHaveProperty("color"); // derived on read, never stored
    expect(mythicPlus.currentSeason?.bestRuns).toEqual([
      // 1583s of a 1980s timer is under 80%: +2, as Raider.IO says too
      { dungeonId: 249, dungeon: "Kings' Rest", keyLevel: 14, upgrades: 2, spec: "Devourer", url: null, completedAt: "2026-08-29T13:18:01.000Z" },
      { dungeonId: 588, dungeon: "Altar of Fangs", keyLevel: 14, upgrades: 1, spec: "Devourer", url: null, completedAt: "2026-08-29T13:18:01.000Z" },
    ]);
  });

  it("rebuilds an ended season's rating from its runs and labels it by Blizzard season id", () => {
    expect(mythicPlus.previousSeason).toMatchObject({ season: "season-mn-1", rating: 704.3 });
  });

  it("leaves a season the config doesn't know unlabelled rather than mislabelled", () => {
    const next = mapBlizzardProgression({
      currentSeason: { season: { id: 99 }, character: { id: ME }, mythic_rating: { rating: 500 }, best_runs: [] },
      previousSeason: null,
      raids: {},
    });
    expect(next.mythicPlus.currentSeason?.season).toBeNull();
  });

  it("sums a multi-instance tier over its journal ids and omits raids without a kill", () => {
    // Raider.IO for the same character: tier-mn-1 7/9 M, the-venomous-abyss 7/8 H
    expect(raidProgression).toEqual([
      { raid: "the-venomous-abyss", normal: 8, heroic: 7, mythic: 0 },
      { raid: "tier-mn-1", normal: 9, heroic: 9, mythic: 7 },
      { raid: "amirdrassil-the-dreams-hope", normal: 0, heroic: 0, mythic: 9 },
    ]);
  });
});
