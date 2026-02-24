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
  }: { logsRequested: boolean; raiderIoRequested: boolean }
) {
  const { name, realm, region } = args;
  logger.info("Character profile request", { name, realm, region, logsRequested, raiderIoRequested });

  if (logsRequested && raiderIoRequested) {
    const [rioResult, logsResult] = await Promise.allSettled([
      RaiderIOService.getCharacterProfile(args),
      WarcraftLogsService.getCharacterProfile(args),
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
      rioProfile:
        rioResult.status === "fulfilled" ? rioResult.value : undefined,
      warcraftLogsProfile:
        logsResult.status === "fulfilled" ? logsResult.value : undefined,
    };
  }

  if (raiderIoRequested) {
    const response = await RaiderIOService.getCharacterProfile(args);
    if (response == null) {
      logger.warn("RaiderIO character profile not found", { name, realm, region });
      throw new GraphQLError("Character Raider.IO profile not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return {
      rioProfile: response,
      warcraftLogsProfile: undefined,
    };
  }

  if (logsRequested) {
    const response = await WarcraftLogsService.getCharacterProfile(args);
    if (response == null) {
      logger.warn("WarcraftLogs character profile not found", { name, realm, region });
      throw new GraphQLError("Character Warcraft Logs profile not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return {
      rioProfile: undefined,
      warcraftLogsProfile: response,
    };
  }

  return { rioProfile: undefined, warcraftLogsProfile: undefined };
}
