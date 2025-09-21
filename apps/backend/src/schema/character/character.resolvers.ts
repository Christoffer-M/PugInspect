import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";

export interface CharacterArgs {
  name: string;
  realm: string;
  region: string;
}

function toTwoDecimals(
  num: number | null | undefined
): number | null | undefined {
  if (num === null || num === undefined) return null;
  return Math.round(num * 100) / 100;
}

export default {
  Query: {
    character: async (_: any, args: CharacterArgs) => {
      const [rioProfile, warcraftLogsProfile] = await Promise.all([
        RaiderIOService.getCharacterProfile(args),
        WarcraftLogsService.getCharacterProfile(
          args.name,
          args.realm,
          args.region
        ),
      ]);

      if (!warcraftLogsProfile?.character) {
        throw new Error("Character not found in Warcraft Logs");
      }

      // Type assertion to ZoneRanking since warcraftLogsProfile.character.zoneRankings is of type JSON
      // and we know its structure based on the query, however its not frozen so it might change
      // in the future so we need to handle that possibility.
      // If the structure changes, this assertion might lead to runtime errors.
      // A more robust solution would involve validating the structure at runtime.
      // For now, we proceed with the assertion for simplicity.
      const zoneRankings = warcraftLogsProfile.character
        .zoneRankings as ZoneRanking;

      return {
        name: args.name,
        realm: args.realm,
        region: args.region,
        thumbnailUrl: rioProfile.thumbnail_url,
        raiderIoScore: {
          all: {
            score:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.all.score,
            color:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.all.color,
          },
          dps: {
            score:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.dps.score,
            color:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.dps.color,
          },
          healer: {
            score:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.healer
                .score,
            color:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.healer
                .color,
          },
          tank: {
            score:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.tank.score,
            color:
              rioProfile.mythic_plus_scores_by_season?.[0]?.segments.tank.color,
          },
        },
        logs: {
          bestPerformanceAverage:
            zoneRankings.bestPerformanceAverage?.toFixed(2),
          medianPerformanceAverage:
            zoneRankings.medianPerformanceAverage?.toFixed(2),
          raidRankings: zoneRankings.rankings?.map((ranking) => ({
            encounter: ranking.encounter
              ? {
                  id: ranking.encounter.id,
                  name: ranking.encounter.name,
                }
              : null,
            rankPercent: ranking.rankPercent?.toFixed(2),
            medianPercent: ranking.medianPercent?.toFixed(2),
            bestAmount: ranking.bestAmount?.toFixed(2),
            totalKills: ranking.totalKills?.toFixed(2),
          })),
        },
      };
    },
    characters: async () => {
      return [];
    },
  },
};
