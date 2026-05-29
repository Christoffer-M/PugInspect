import { MythicPlusLogs } from "@repo/graphql-types";
import { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";
import { mapEncounter, sanitizeMetric, toFixedNumber } from "../utils/helpers.js";

export function mapMythicPlusLogs(
  characterData: CharacterProfileQuery["characterData"]
): MythicPlusLogs | null {
  const zoneRankings = characterData?.character?.zoneRankings as
    | ZoneRanking
    | undefined;

  if (!zoneRankings) return null;

  return {
    bestPerformanceAverage: toFixedNumber(zoneRankings.bestPerformanceAverage),
    medianPerformanceAverage: toFixedNumber(
      zoneRankings.medianPerformanceAverage
    ),
    metric: sanitizeMetric(zoneRankings.metric),
    dungeonRankings: zoneRankings.rankings?.map((ranking) => {
      const encounterId = ranking.encounter?.id;
      const throughput = encounterId != null
        ? zoneRankings.throughputRankings?.[String(encounterId)]
        : undefined;

      return {
        dungeon: mapEncounter(ranking.encounter),
        rankPercent: toFixedNumber(ranking.rankPercent),
        medianPercent: toFixedNumber(ranking.medianPercent),
        bestScore: toFixedNumber(ranking.bestAmount),
        throughputPercent: throughput?.best_historical_percentile ?? null,
        medianThroughputPercent: throughput?.median_historical_percentile ?? null,
        bestThroughput: throughput?.best_per_second_amount != null
          ? Math.round(throughput.best_per_second_amount)
          : null,
        bestLevel: throughput?.best_level ?? null,
        lowParses: throughput?.best_historical_low_parses ?? null,
        totalRuns: ranking.totalKills ?? null,
        spec: ranking.spec,
      };
    }),
  };
}
