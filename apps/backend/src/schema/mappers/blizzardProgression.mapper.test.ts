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
  mythic_rating: { color: { r: 255, g: 128, b: 0, a: 1 }, rating },
  members: [
    { character: { id: 1 }, specialization: { name: "Blood" } },
    { character: { id: ME }, specialization: { name: "Devourer" } },
  ],
});
const instance = (id: number, name: string, kills: Record<string, number>, bosses: string[]): BlizzardRaidInstance => ({
  instance: { id, name },
  modes: Object.entries(kills).map(([type, completed_count]) => ({
    difficulty: { type },
    progress: { completed_count, encounters: bosses.map((b) => ({ encounter: { name: b } })) },
  })),
});
const midnight = [
  instance(1307, "The Voidspire", { NORMAL: 6, HEROIC: 6, MYTHIC: 6 }, ["Imperator Averzian"]),
  instance(1314, "The Dreamrift", { NORMAL: 1, HEROIC: 1, MYTHIC: 1 }, ["Chimaerus the Undreamt God"]),
  instance(1308, "March on Quel'Danas", { NORMAL: 2, HEROIC: 2 }, ["Midnight Falls"]),
  instance(1320, "The Venomous Abyss", { NORMAL: 8, HEROIC: 7 }, ["Nek'zali the Soulcoiler"]),
];

describe("mapBlizzardProgression", () => {
  const { mythicPlus, raidProgression } = mapBlizzardProgression({
    currentSeason: {
      character: { id: ME },
      mythic_rating: { color: { r: 255, g: 128, b: 0, a: 1 }, rating: 3179.455 },
      best_runs: [
        run(249, "Kings' Rest", 15, false, 2630, 307.7),
        run(249, "Kings' Rest", 14, true, 1583, 402.5),
        run(588, "Altar of Fangs", 14, true, 1473, 401.8),
      ],
    },
    // Ended season: Blizzard zeroes the rating but keeps the runs.
    previousSeason: {
      character: { id: ME },
      mythic_rating: { color: { r: 255, g: 255, b: 255, a: 0 }, rating: 0 },
      best_runs: [run(249, "Kings' Rest", 14, true, 1583, 402.5), run(588, "Altar of Fangs", 14, false, 1900, 301.8)],
    },
    raids: {
      expansions: [
        { instances: midnight }, // "Current Season"
        { instances: midnight }, // Midnight — the same instances again
        { instances: [instance(1207, "Amirdrassil, the Dream's Hope", { MYTHIC: 9 }, ["Gnarlroot"])] },
      ],
    },
  });

  it("keeps the highest-rated run per dungeon, with the character's own spec", () => {
    expect(mythicPlus.currentSeason).toMatchObject({ season: "season-mn-2", rating: 3179.455, color: "#ff8000" });
    expect(mythicPlus.currentSeason?.bestRuns).toEqual([
      // 1583s of a 1980s timer is under 80%: +2, as Raider.IO says too
      { dungeonId: 249, dungeon: "Kings' Rest", keyLevel: 14, upgrades: 2, spec: "Devourer", url: null, completedAt: "2026-08-29T13:18:01.000Z" },
      { dungeonId: 588, dungeon: "Altar of Fangs", keyLevel: 14, upgrades: 1, spec: "Devourer", url: null, completedAt: "2026-08-29T13:18:01.000Z" },
    ]);
  });

  it("rebuilds an ended season's rating from its runs, without a colour", () => {
    expect(mythicPlus.previousSeason).toMatchObject({ season: "season-mn-1", rating: 704.3, color: null });
  });

  it("sums a multi-instance tier and omits raids without a kill", () => {
    // Raider.IO for the same character: tier-mn-1 7/9 M, the-venomous-abyss 7/8 H
    expect(raidProgression).toEqual([
      { raid: "the-venomous-abyss", normal: 8, heroic: 7, mythic: 0 },
      { raid: "tier-mn-1", normal: 9, heroic: 9, mythic: 7 },
      { raid: "amirdrassil-the-dreams-hope", normal: 0, heroic: 0, mythic: 9 },
    ]);
    // Blizzard doesn't track awakened raids apart, so the shared bosses don't leak into them.
  });
});
