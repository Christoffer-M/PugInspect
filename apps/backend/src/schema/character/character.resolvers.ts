import { GraphQLError, GraphQLResolveInfo } from "graphql";
import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import { ZoneRanking } from "../services/warcraftLogs/model/ZoneRankings.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import { Character, QueryCharacterArgs } from "@repo/graphql-types";
import { CharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";
import { CharacterProfileQuery } from "../services/warcraftLogs/generated/index.js";
import {
  FieldsByTypeName,
  parseResolveInfo,
  simplifyParsedResolveInfoFragmentWithType,
} from "graphql-parse-resolve-info";

function toFixedNumber(value: number | undefined, digits = 2): number | null {
  return typeof value === "number" ? parseFloat(value.toFixed(digits)) : null;
}

function mapRaiderIo(rioProfile?: CharacterApiResponse) {
  const segments = rioProfile?.mythic_plus_scores_by_season?.[0]?.segments;
  console.log("segments", segments);

  if (!segments) return null;
  return {
    thumbnailUrl: rioProfile.thumbnail_url,
    all: { score: segments.all.score, color: segments.all.color },
    dps: { score: segments.dps.score, color: segments.dps.color },
    healer: { score: segments.healer.score, color: segments.healer.color },
    tank: { score: segments.tank.score, color: segments.tank.color },
  };
}

function mapWarcraftLogs(
  characterData?: CharacterProfileQuery["characterData"]
) {
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
        [rioProfile, warcraftLogsProfile] = await Promise.all([
          RaiderIOService.getCharacterProfile(args),
          WarcraftLogsService.getCharacterProfile(
            args.name,
            args.realm,
            args.region,
            args.role,
            args.metric
          ),
        ]);
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
          args.metric
        );
        rioProfile = undefined;
      }

      return {
        name: args.name,
        realm: args.realm,
        region: args.region,
        raiderIo: raiderIoRequested ? mapRaiderIo(rioProfile) : null,
        warcraftLogs: logsRequested
          ? mapWarcraftLogs(warcraftLogsProfile)
          : null,
      };
    },
  },
};
