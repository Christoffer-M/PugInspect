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
    bypassCache,
  }: { logsRequested: boolean; raiderIoRequested: boolean; bypassCache: boolean }
) {
  const { name, realm, region } = args;
  logger.info("Character profile request", { name, realm, region, logsRequested, raiderIoRequested, bypassCache });

  // Blizzard is always fetched — it is the primary source of truth for character identity.
  // RaiderIO and WarcraftLogs are fetched only when their sub-fields are requested.
  const [blizzardResult, rioResult, logsResult] = await Promise.allSettled([
    BlizzardService.getCharacterProfile(args, bypassCache),
    raiderIoRequested
      ? RaiderIOService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
    logsRequested
      ? WarcraftLogsService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
  ]);


  
  // Blizzard failure is fatal — character either doesn't exist or is unreachable.
  if (blizzardResult.status === "rejected") {
    logger.error("Blizzard profile failed", {
      name, realm, region,
      error: blizzardResult.reason instanceof Error ? blizzardResult.reason.message : String(blizzardResult.reason),
    });
    throw blizzardResult.reason;
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
    blizzardProfile: blizzardResult.value.data,
    blizzardFetchedAt: blizzardResult.value.fetchedAt,
    rioProfile: rioResult.status === "fulfilled" ? rioResult.value?.data ?? undefined : undefined,
    rioFetchedAt: rioResult.status === "fulfilled" ? rioResult.value?.fetchedAt ?? undefined : undefined,
    warcraftLogsProfile: logsResult.status === "fulfilled" ? logsResult.value?.data ?? undefined : undefined,
    logsFetchedAt: logsResult.status === "fulfilled" ? logsResult.value?.fetchedAt ?? undefined : undefined,
  };
}
