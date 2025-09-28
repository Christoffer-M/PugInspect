import { QueryCharacterArgs } from "@repo/graphql-types";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { GraphQLError } from "graphql";

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
      WarcraftLogsService.getCharacterProfile(args),
    ]);

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
