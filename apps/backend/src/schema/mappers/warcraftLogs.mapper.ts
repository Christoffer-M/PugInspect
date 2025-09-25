import { Logs } from "@repo/graphql-types";
import { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";
import { mapDifficultyIdToName, toFixedNumber } from "../utils/helpers.js";

export function mapWarcraftLogs(
  characterData: CharacterProfileQuery["characterData"]
): Logs | null {
  const zoneRankings = characterData?.character?.zoneRankings as
    | ZoneRanking
    | undefined;

  if (!zoneRankings) return null;

  return {
    bestPerformanceAverage: toFixedNumber(zoneRankings.bestPerformanceAverage),
    medianPerformanceAverage: toFixedNumber(
      zoneRankings.medianPerformanceAverage
    ),
    metric: zoneRankings.metric,
    difficulty: mapDifficultyIdToName(zoneRankings.difficulty),
    raidRankings: zoneRankings.rankings?.map((ranking) => ({
      encounter:
        ranking.encounter &&
        typeof ranking.encounter.id === "number" &&
        typeof ranking.encounter.name === "string"
          ? { id: ranking.encounter.id, name: ranking.encounter.name }
          : null,
      rankPercent: toFixedNumber(ranking.rankPercent),
      medianPercent: toFixedNumber(ranking.medianPercent),
      bestAmount: toFixedNumber(ranking.bestAmount),
      totalKills: toFixedNumber(ranking.totalKills),
      spec: ranking.spec,
    })),
  };
}
