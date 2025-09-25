import { GraphQLError, GraphQLResolveInfo } from "graphql";
import { Character, QueryCharacterArgs } from "@repo/graphql-types";
import { parseResolveInfo } from "graphql-parse-resolve-info";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { mapRaiderIo } from "../mappers/raiderIo.mapper.js";
import { mapWarcraftLogs } from "../mappers/warcraftLogs.mapper.js";
import { isFieldRequested } from "../utils/fetcher.js";

export default {
  Query: {
    character: async (
      _: any,
      args: QueryCharacterArgs,
      _context: any,
      info: GraphQLResolveInfo
    ): Promise<Character> => {
      const logsRequested = isFieldRequested(info, "warcraftLogs");
      const raiderIoRequested = isFieldRequested(info, "raiderIo");

      const { rioProfile, warcraftLogsProfile } = await getCharacterProfiles(
        args,
        {
          logsRequested: logsRequested ?? false,
          raiderIoRequested: raiderIoRequested ?? false,
        }
      );

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
