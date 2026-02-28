import { QueryCharacterArgs } from "@repo/graphql-types";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { GraphQLError } from "graphql";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger({ service: "CharacterProfile" });

export async function getCharacterProfiles(
  args: QueryCharacterArgs,
  {
    logsRequested,
    raiderIoRequested,
    bypassCache,
  }: { logsRequested: boolean; raiderIoRequested: boolean; bypassCache: boolean }
) {
  const { name, realm, region } = args;
  logger.info("Character profile request", { name, realm, region, logsRequested, raiderIoRequested, bypassCache });

  if (logsRequested && raiderIoRequested) {
    const [rioResult, logsResult] = await Promise.allSettled([
      RaiderIOService.getCharacterProfile(args, bypassCache),
      WarcraftLogsService.getCharacterProfile(args, bypassCache),
    ]);

    if (rioResult.status === "rejected") {
      logger.error("RaiderIO profile failed in parallel fetch", {
        name, realm, region,
        error: rioResult.reason instanceof Error ? rioResult.reason.message : String(rioResult.reason),
      });
    }
    if (logsResult.status === "rejected") {
      logger.error("WarcraftLogs profile failed in parallel fetch", {
        name, realm, region,
        error: logsResult.reason instanceof Error ? logsResult.reason.message : String(logsResult.reason),
      });
    }

    return {
      rioProfile: rioResult.status === "fulfilled" ? rioResult.value.data : undefined,
      rioFetchedAt: rioResult.status === "fulfilled" ? rioResult.value.fetchedAt : undefined,
      warcraftLogsProfile: logsResult.status === "fulfilled" ? logsResult.value.data : undefined,
      logsFetchedAt: logsResult.status === "fulfilled" ? logsResult.value.fetchedAt : undefined,
    };
  }

  if (raiderIoRequested) {
    const result = await RaiderIOService.getCharacterProfile(args, bypassCache);
    if (result.data == null) {
      logger.warn("RaiderIO character profile not found", { name, realm, region });
      throw new GraphQLError("Character Raider.IO profile not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return {
      rioProfile: result.data,
      rioFetchedAt: result.fetchedAt,
      warcraftLogsProfile: undefined,
      logsFetchedAt: undefined,
    };
  }

  if (logsRequested) {
    const result = await WarcraftLogsService.getCharacterProfile(args, bypassCache);
    if (result.data == null) {
      logger.warn("WarcraftLogs character profile not found", { name, realm, region });
      throw new GraphQLError("Character Warcraft Logs profile not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return {
      rioProfile: undefined,
      rioFetchedAt: undefined,
      warcraftLogsProfile: result.data,
      logsFetchedAt: result.fetchedAt,
    };
  }

  return { rioProfile: undefined, rioFetchedAt: undefined, warcraftLogsProfile: undefined, logsFetchedAt: undefined };
}
