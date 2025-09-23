import { GraphQLError, GraphQLResolveInfo } from "graphql";
import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import {
  Character,
  Logs,
  QueryCharacterArgs,
  RaiderIo,
} from "@repo/graphql-types";
import { CharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";
import { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import { parseResolveInfo } from "graphql-parse-resolve-info";
import { mapDifficultyIdToName } from "../utils/helpers.js";

function toFixedNumber(value: number | undefined, digits = 2): number | null {
  return typeof value === "number" ? parseFloat(value.toFixed(digits)) : null;
}

function mapRaiderIo(rioProfile: CharacterApiResponse): RaiderIo | null {
  const segments = rioProfile.mythic_plus_scores_by_season?.[0]?.segments;
  return {
    thumbnailUrl: rioProfile.thumbnail_url,
    race: rioProfile.race,
    all: segments
      ? { score: segments.all.score, color: segments.all.color }
      : null,
    dps: segments
      ? { score: segments.dps.score, color: segments.dps.color }
      : null,
    healer: segments
      ? { score: segments.healer.score, color: segments.healer.color }
      : null,
    tank: segments
      ? { score: segments.tank.score, color: segments.tank.color }
      : null,
  };
}

function mapWarcraftLogs(
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
    })),
  };
}

export default {
  Query: {
    character: async (
      _: any,
      args: QueryCharacterArgs,
      _context: any,
      info: GraphQLResolveInfo
    ): Promise<Character> => {
      const parsedResolveInfoFragment = parseResolveInfo(info);
      if (!parsedResolveInfoFragment) {
        throw new GraphQLError("Failed to parse resolve info");
      }

      // Check if 'logs' is requested
      const logsRequested = info.fieldNodes[0]?.selectionSet?.selections.some(
        (selection: any) =>
          selection.kind === "Field" && selection.name.value === "warcraftLogs"
      );

      const raiderIoRequested =
        info.fieldNodes[0]?.selectionSet?.selections.some(
          (selection: any) =>
            selection.kind === "Field" && selection.name.value === "raiderIo"
        );

      let rioProfile: CharacterApiResponse | undefined;
      let warcraftLogsProfile: CharacterProfileQuery["characterData"];

      if (logsRequested && raiderIoRequested) {
        // Parallelize both calls
        const [rioResult, logsResult] = await Promise.allSettled([
          RaiderIOService.getCharacterProfile(args),
          WarcraftLogsService.getCharacterProfile(
            args.name,
            args.realm,
            args.region,
            args.role,
            args.metric,
            args.difficulty
          ),
        ]);

        rioProfile =
          rioResult.status === "fulfilled" ? rioResult.value : undefined;
        warcraftLogsProfile =
          logsResult.status === "fulfilled" ? logsResult.value : undefined;
      } else if (raiderIoRequested) {
        // Only fetch RaiderIO
        rioProfile = await RaiderIOService.getCharacterProfile(args);
        warcraftLogsProfile = undefined;
      } else if (logsRequested) {
        // Only fetch Warcraft Logs
        warcraftLogsProfile = await WarcraftLogsService.getCharacterProfile(
          args.name,
          args.realm,
          args.region,
          args.role,
          args.metric,
          args.difficulty
        );
        rioProfile = undefined;
      }

      return {
        name: args.name,
        realm: args.realm,
        region: args.region,
        raiderIo:
          raiderIoRequested && rioProfile ? mapRaiderIo(rioProfile) : null,
        warcraftLogs:
          logsRequested && warcraftLogsProfile
            ? mapWarcraftLogs(warcraftLogsProfile)
            : null,
      };
    },
  },
};
