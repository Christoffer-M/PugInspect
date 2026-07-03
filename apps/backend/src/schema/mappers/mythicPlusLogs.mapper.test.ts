import { describe, it, expect } from "vitest";
import { mapMythicPlusLogs } from "./mythicPlusLogs.mapper.js";
import type { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import type { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";

function characterData(zoneRankings?: ZoneRanking) {
  return {
    character: { zoneRankings },
  } as unknown as CharacterProfileQuery["characterData"];
}

const zoneRankings: ZoneRanking = {
  bestPerformanceAverage: 65.4321,
  medianPerformanceAverage: 55.5,
  metric: "points_and_damage",
  rankings: [
    {
      encounter: { id: 112898, name: "The Rookery" },
      rankPercent: 71.239,
      medianPercent: 65.01,
      bestAmount: 320.5,
      totalKills: 8,
      spec: "Enhancement",
    },
    {
      encounter: { id: 999, name: "No Throughput Data" },
      rankPercent: 50,
      medianPercent: 40,
      bestAmount: 300,
      totalKills: 3,
      spec: "Enhancement",
    },
  ],
  // Keyed by encounter id — only the first dungeon has throughput data
  throughputRankings: {
    "112898": {
      best_per_second_amount: 1234567.6,
      best_level: 14,
      best_historical_percentile: 82.5,
      median_historical_percentile: 70.1,
      best_historical_low_parses: false,
    },
  },
};

describe("mapMythicPlusLogs", () => {
  it("joins throughput rankings onto dungeons by encounter id", () => {
    const result = mapMythicPlusLogs(characterData(zoneRankings));

    expect(result!.bestPerformanceAverage).toBe(65.43);
    expect(result!.medianPerformanceAverage).toBe(55.5);
    expect(result!.metric).toBe("points_and_damage");

    expect(result!.dungeonRankings![0]).toEqual({
      dungeon: { id: 112898, name: "The Rookery" },
      rankPercent: 71.24,
      medianPercent: 65.01,
      bestScore: 320.5,
      throughputPercent: 82.5,
      medianThroughputPercent: 70.1,
      bestThroughput: 1234568, // rounded to whole number
      bestLevel: 14,
      lowParses: false,
      totalRuns: 8,
      spec: "Enhancement",
    });
  });

  it("nulls throughput fields when no throughput data exists for the dungeon", () => {
    const result = mapMythicPlusLogs(characterData(zoneRankings));

    expect(result!.dungeonRankings![1]).toEqual({
      dungeon: { id: 999, name: "No Throughput Data" },
      rankPercent: 50,
      medianPercent: 40,
      bestScore: 300,
      throughputPercent: null,
      medianThroughputPercent: null,
      bestThroughput: null,
      bestLevel: null,
      lowParses: null,
      totalRuns: 3,
      spec: "Enhancement",
    });
  });

  it("returns null when zone rankings are missing", () => {
    expect(mapMythicPlusLogs(characterData(undefined))).toBeNull();
    expect(mapMythicPlusLogs(undefined)).toBeNull();
  });
});
