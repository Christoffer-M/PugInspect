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
  const base = {
    thumbnailUrl: rioProfile.thumbnail_url,
    race: rioProfile.race,
    class: rioProfile.class,
  };
  const segments = rioProfile.mythic_plus_scores_by_season?.[0]?.segments;
  const raidProgression = Object.entries(rioProfile.raid_progression || {}).map(
    ([raid, details]) => ({
      raid,
      ...details,
    })
  );

  if (!segments) {
    return {
      ...base,
      raidProgression,
    };
  }

  return {
    ...base,
    all: {
      color: segments.all.color,
      score: segments.all.score,
    },
    dps: {
      color: segments.dps.color,
      score: segments.dps.score,
    },
    healer: {
      color: segments.healer.color,
      score: segments.healer.score,
    },

    tank: {
      color: segments.tank.color,
      score: segments.tank.score,
    },
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
      spec: ranking.spec,
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

      if (!rioProfile && !warcraftLogsProfile) {
        throw new GraphQLError("Character not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return {
        name: rioProfile ? rioProfile.name : args.name,
        realm: rioProfile ? rioProfile.realm : args.realm,
        region: rioProfile ? rioProfile.region : args.region,
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
