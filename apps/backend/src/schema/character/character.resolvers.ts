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
import { AchievementsService } from "../services/blizzard/achievements.service.js";
import { getLinkedCharacters } from "../../db/persistence.js";
import { VALID_REGIONS } from "../utils/regions.js";

/**
 * Return type for the Query.character resolver.
 * Omits fields handled by dedicated field resolvers (achievements, potentialAlts)
 * and adds the internal _characterId threaded to field resolvers.
 */
type CharacterWithMeta = Omit<Character, "achievements" | "potentialAlts"> & { _characterId: string | null };

export default {
  Query: {
    character: async (
      _: unknown,
      args: QueryCharacterArgs,
      _context: unknown,
      info: GraphQLResolveInfo
    ): Promise<CharacterWithMeta> => {
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

      const { blizzardProfile, blizzardAvatarUrl, rioProfile, warcraftLogsProfile, characterId } =
        await getCharacterProfiles(args, {
          logsRequested,
          raiderIoRequested,
          blizzardRequested,
          bypassCache: args.bypassCache ?? false,
        });

      // Background alt detection — fire-and-forget, never blocks the response
      if (characterId) {
        AchievementsService.enrichAndLinkAlts(characterId, {
          name: args.name,
          realm: args.realm,
          region: args.region,
        }).catch(() => {
          // Silently swallow — alt detection is best-effort
        });
      }

      return {
        name: blizzardProfile?.name ?? args.name,
        realm: blizzardProfile?.realm.name ?? args.realm,
        region: args.region,
        // Internal field — not in the GraphQL schema, used by field resolvers below
        _characterId: characterId ?? null,
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

  Character: {
    potentialAlts: async (parent: CharacterWithMeta) => {
      if (!parent._characterId) return [];
      return getLinkedCharacters(parent._characterId);
    },
  },
};
