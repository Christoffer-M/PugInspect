import { QueryCharacterArgs } from "@repo/graphql-types";
import { BlizzardService } from "../blizzard/blizzard.services.js";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger({ service: "CharacterProfile" });

export async function getCharacterProfiles(
  args: QueryCharacterArgs,
  {
    logsRequested,
    raiderIoRequested,
    blizzardRequested,
    bypassCache,
  }: { logsRequested: boolean; raiderIoRequested: boolean; blizzardRequested: boolean; bypassCache: boolean }
) {
  const { name, realm, region } = args;
  logger.info("Character profile request", { name, realm, region, blizzardRequested, logsRequested, raiderIoRequested, bypassCache });

  const [blizzardResult, rioResult, logsResult] = await Promise.allSettled([
    blizzardRequested
      ? BlizzardService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
    raiderIoRequested
      ? RaiderIOService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
    logsRequested
      ? WarcraftLogsService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
  ]);

  // Blizzard failure is fatal when requested — character either doesn't exist or is unreachable.
  if (blizzardResult.status === "rejected") {
    logger.error("Blizzard profile failed", {
      name, realm, region,
      error: blizzardResult.reason instanceof Error ? blizzardResult.reason.message : String(blizzardResult.reason),
    });
  }

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
    blizzardProfile: blizzardResult.status === "fulfilled" ? blizzardResult.value?.data : undefined,
    blizzardAvatarUrl: blizzardResult.status === "fulfilled" ? blizzardResult.value?.avatarUrl : undefined,
    rioProfile: rioResult.status === "fulfilled" ? rioResult.value?.data : undefined,
    warcraftLogsProfile: logsResult.status === "fulfilled" ? logsResult.value?.data : undefined,
  };
}
