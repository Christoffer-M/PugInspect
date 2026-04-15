import { GraphQLError, GraphQLResolveInfo } from "graphql";
import {
  Character,
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
} from "@repo/graphql-types";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { mapBlizzardCharacter } from "../mappers/blizzard.mapper.js";
import { mapRaiderIo } from "../mappers/raiderIo.mapper.js";
import { mapWarcraftLogs } from "../mappers/warcraftLogs.mapper.js";
import { isAnyFieldRequestedBesides, isFieldRequested } from "../utils/fetcher.js";
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
      const blizzardRequested = isAnyFieldRequestedBesides(
        info,
        new Set(["raiderIo", "warcraftLogs"])
      );

      const { blizzardProfile, blizzardAvatarUrl, rioProfile, warcraftLogsProfile } =
        await getCharacterProfiles(args, {
          logsRequested,
          raiderIoRequested,
          blizzardRequested,
          bypassCache: args.bypassCache ?? false,
        });

      return {
        name: blizzardProfile?.name ?? args.name,
        realm: blizzardProfile?.realm.name ?? args.realm,
        region: args.region,
        ...(blizzardProfile ? mapBlizzardCharacter(blizzardProfile, blizzardAvatarUrl ?? null) : {}),
        raiderIo: raiderIoRequested && rioProfile ? mapRaiderIo(rioProfile) : null,
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
