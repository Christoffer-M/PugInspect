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

const VALID_REGIONS = new Set(["eu", "us", "kr", "tw", "cn"]);

export default {
  Query: {
    character: async (
      _: unknown,
      args: QueryCharacterArgs,
      _context: unknown,
      info: GraphQLResolveInfo
    ): Promise<Character> => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

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
      _: unknown,
      args: QueryCharacterSuggestionsArgs,
      _context: unknown,
      _info: GraphQLResolveInfo
    ): Promise<CharacterSearchResponse[]> => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

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
