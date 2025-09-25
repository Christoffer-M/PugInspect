import { QueryCharacterArgs } from "@repo/graphql-types";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";

export async function getCharacterProfiles(
  args: QueryCharacterArgs,
  {
    logsRequested,
    raiderIoRequested,
  }: { logsRequested: boolean; raiderIoRequested: boolean }
) {
  if (logsRequested && raiderIoRequested) {
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

    return {
      rioProfile:
        rioResult.status === "fulfilled" ? rioResult.value : undefined,
      warcraftLogsProfile:
        logsResult.status === "fulfilled" ? logsResult.value : undefined,
    };
  }

  if (raiderIoRequested) {
    return {
      rioProfile: await RaiderIOService.getCharacterProfile(args),
      warcraftLogsProfile: undefined,
    };
  }

  if (logsRequested) {
    return {
      rioProfile: undefined,
      warcraftLogsProfile: await WarcraftLogsService.getCharacterProfile(
        args.name,
        args.realm,
        args.region,
        args.role,
        args.metric,
        args.difficulty
      ),
    };
  }

  return { rioProfile: undefined, warcraftLogsProfile: undefined };
}
