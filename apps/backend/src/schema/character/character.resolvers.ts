import { GraphQLError, GraphQLResolveInfo } from "graphql";
import {
  Character,
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
} from "@repo/graphql-types";
import { parseResolveInfo } from "graphql-parse-resolve-info";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { mapRaiderIo } from "../mappers/raiderIo.mapper.js";
import { mapWarcraftLogs } from "../mappers/warcraftLogs.mapper.js";
import { isFieldRequested } from "../utils/fetcher.js";
import {
  CharacterSearchResponse,
  RaiderIOService,
} from "../services/raiderIo/raiderio.services.js";

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

      const { rioProfile, rioFetchedAt, warcraftLogsProfile, logsFetchedAt } = await getCharacterProfiles(
        args,
        {
          logsRequested: logsRequested ?? false,
          raiderIoRequested: raiderIoRequested ?? false,
          bypassCache: args.bypassCache ?? false,
        }
      );

      if (!rioProfile && !warcraftLogsProfile) {
        throw new GraphQLError("Character not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const fetchedAtSeconds = Math.min(
        rioFetchedAt ?? Infinity,
        logsFetchedAt ?? Infinity
      );
      const fetchedAt = isFinite(fetchedAtSeconds)
        ? new Date(fetchedAtSeconds * 1000).toISOString()
        : undefined;

      return {
        name: rioProfile ? rioProfile.name : args.name,
        realm: rioProfile ? rioProfile.realm : args.realm,
        region: rioProfile ? rioProfile.region : args.region,
        fetchedAt,
        raiderIo:
          raiderIoRequested && rioProfile ? mapRaiderIo(rioProfile) : null,
        warcraftLogs:
          logsRequested && warcraftLogsProfile
            ? mapWarcraftLogs(warcraftLogsProfile)
            : null,
      };
    },
    characterSuggestions: async (
      _: any,
      args: QueryCharacterSuggestionsArgs,
      _context: any,
      _info: GraphQLResolveInfo
    ): Promise<CharacterSearchResponse[]> => {
      if (args.searchString.length < 3) {
        throw new GraphQLError(
          "Search string must be at least 3 characters long",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      return await RaiderIOService.getCharacterSuggestions(args);
    },
  },
};
