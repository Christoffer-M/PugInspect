import { QueryCharacterArgs } from "@repo/graphql-types";
import { GraphQLError } from "graphql";
import { BlizzardService } from "../blizzard/blizzard.services.js";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger({ service: "CharacterProfile" });

// A missing character is expected user input, not a failure — and the service
// already warn-logged it with more detail, so don't log it a second time here.
function logRejection(source: string, reason: unknown, ctx: { name: string; realm: string; region: string }) {
  if (reason instanceof GraphQLError && reason.extensions.code === "NOT_FOUND") {
    return;
  }
  logger.error(`${source} profile failed`, {
    ...ctx,
    error: reason instanceof Error ? reason.message : String(reason),
  });
}

export async function getCharacterProfiles(
  args: QueryCharacterArgs,
  {
    raidLogsRequested,
    mythicPlusLogsRequested,
    raiderIoRequested,
    blizzardRequested,
    bypassCache,
  }: { raidLogsRequested: boolean; mythicPlusLogsRequested: boolean; raiderIoRequested: boolean; blizzardRequested: boolean; bypassCache: boolean }
) {
  const { name, realm, region } = args;
  logger.info("Character profile request", { name, realm, region, blizzardRequested, raidLogsRequested, mythicPlusLogsRequested, raiderIoRequested, bypassCache });

  const [blizzardResult, rioResult, logsResult] = await Promise.allSettled([
    blizzardRequested
      ? BlizzardService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
    raiderIoRequested
      ? RaiderIOService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
    raidLogsRequested || mythicPlusLogsRequested
      ? WarcraftLogsService.getCharacterProfile(args, bypassCache)
      : Promise.resolve(null),
  ]);

  if (blizzardResult.status === "rejected") logRejection("Blizzard", blizzardResult.reason, { name, realm, region });
  if (rioResult.status === "rejected") logRejection("RaiderIO", rioResult.reason, { name, realm, region });
  if (logsResult.status === "rejected") logRejection("WarcraftLogs", logsResult.reason, { name, realm, region });

  return {
    blizzardProfile: blizzardResult.status === "fulfilled" ? blizzardResult.value?.data : undefined,
    blizzardAvatarUrl: blizzardResult.status === "fulfilled" ? blizzardResult.value?.avatarUrl : undefined,
    characterId: blizzardResult.status === "fulfilled" ? (blizzardResult.value?.characterId ?? null) : null,
    rioProfile: rioResult.status === "fulfilled" ? rioResult.value?.data : undefined,
    warcraftLogsProfile: logsResult.status === "fulfilled" ? logsResult.value?.data : undefined,
  };
}
