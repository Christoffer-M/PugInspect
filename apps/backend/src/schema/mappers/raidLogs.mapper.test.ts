import { describe, it, expect } from "vitest";
import { mapRaidLogs } from "./raidLogs.mapper.js";
import type { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import type { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";

function characterData(zoneRankings?: ZoneRanking) {
  return {
    character: { zoneRankings },
  } as unknown as CharacterProfileQuery["characterData"];
}

const zoneRankings: ZoneRanking = {
  bestPerformanceAverage: 87.6543,
  medianPerformanceAverage: 75.1,
  difficulty: 5,
  metric: "dps",
  rankings: [
    {
      encounter: { id: 3009, name: "Vexie and the Geargrinders" },
      rankPercent: 92.346,
      medianPercent: 88.9,
      totalKills: 12,
      bestAmount: 1234567.89,
      spec: "Enhancement",
      bestRank: { ilvl: 678 },
    },
    {
      // Sparse ranking — everything optional missing
      spec: "Enhancement",
      bestRank: {},
    },
  ],
};

describe("mapRaidLogs", () => {
  it("maps zone rankings with rounding, difficulty, and encounter mapping", () => {
    const result = mapRaidLogs(characterData(zoneRankings));

    expect(result).toEqual({
      bestPerformanceAverage: 87.65,
      medianPerformanceAverage: 75.1,
      metric: "dps",
      difficulty: "Mythic",
      raidRankings: [
        {
          encounter: { id: 3009, name: "Vexie and the Geargrinders" },
          rankPercent: 92.35,
          medianPercent: 88.9,
          bestAmount: 1234567.89,
          totalKills: 12,
          spec: "Enhancement",
          bestRank: { ilvl: 678 },
        },
        {
          encounter: null,
          rankPercent: null,
          medianPercent: null,
          bestAmount: null,
          totalKills: null,
          spec: "Enhancement",
          bestRank: null,
        },
      ],
    });
  });

  it("nulls out an invalid metric", () => {
    const result = mapRaidLogs(
      characterData({ ...zoneRankings, metric: "playerscore" as ZoneRanking["metric"] })
    );
    expect(result!.metric).toBeNull();
  });

  it("returns null when zone rankings are missing", () => {
    expect(mapRaidLogs(characterData(undefined))).toBeNull();
    expect(mapRaidLogs(undefined)).toBeNull();
  });
});
