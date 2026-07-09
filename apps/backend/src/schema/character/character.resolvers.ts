import { GraphQLError, GraphQLResolveInfo } from "graphql";
import {
  Character,
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
  QueryZonePartitionsArgs,
} from "@repo/graphql-types";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { mapBlizzardCharacter } from "../mappers/blizzard.mapper.js";
import { mapRaiderIo } from "../mappers/raiderIo.mapper.js";
import { mapRaidLogs } from "../mappers/raidLogs.mapper.js";
import { mapMythicPlusLogs } from "../mappers/mythicPlusLogs.mapper.js";
import { mapGear } from "../mappers/gear.mapper.js";
import { isAnyFieldRequestedBesides, isFieldRequested } from "../utils/fetcher.js";
import {
  CharacterSearchResponse,
  RaiderIOService,
} from "../services/raiderIo/raiderio.services.js";
import { AchievementsService } from "../services/blizzard/achievements.service.js";
import { getLinkedCharacters } from "../../db/persistence.js";
import { getSiteStats, recordSearchEvent, type SiteStats } from "../../db/stats.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import { VALID_REGIONS } from "../utils/regions.js";

/**
 * Return type for the Query.character resolver.
 * Omits fields handled by dedicated field resolvers (achievements, potentialAlts)
 * and adds the internal _characterId threaded to field resolvers.
 */
type CharacterWithMeta = Omit<Character, "achievements" | "potentialAlts"> & { _characterId: string | null };

// ponytail: module-level 60s cache — stats are count queries, no need to hit
// the DB per request. Move to a shared cache layer if more queries need it.
let statsCache: { data: SiteStats; expiresAt: number } | null = null;

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

      const raidLogsRequested = isFieldRequested(info, "raidLogs");
      const mythicPlusLogsRequested = isFieldRequested(info, "mythicPlusLogs");
      const raiderIoRequested = isFieldRequested(info, "raiderIo");
      const gearRequested = isFieldRequested(info, "gear");
      const blizzardRequested = isAnyFieldRequestedBesides(
        info,
        new Set(["raiderIo", "raidLogs", "mythicPlusLogs", "gear"])
      );

      const { blizzardProfile, blizzardAvatarUrl, rioProfile, warcraftLogsProfile, characterId, equipment } =
        await getCharacterProfiles(args, {
          raidLogsRequested,
          mythicPlusLogsRequested,
          raiderIoRequested,
          blizzardRequested,
          gearRequested,
          bypassCache: args.bypassCache ?? false,
        });

      // Search analytics — only the identity query (blizzard fields) counts as
      // a "search", so the raiderIo/raidLogs/mythicPlusLogs follow-up queries a
      // page view issues don't multi-count. Fire-and-forget.
      if (characterId && blizzardRequested) {
        // recordSearchEvent swallows its own errors — safe to not await
        void recordSearchEvent(characterId);
      }

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
        raidLogs:
          raidLogsRequested && warcraftLogsProfile
            ? mapRaidLogs(warcraftLogsProfile)
            : null,
        mythicPlusLogs:
          mythicPlusLogsRequested && warcraftLogsProfile
            ? mapMythicPlusLogs(warcraftLogsProfile)
            : null,
        gear: gearRequested && equipment ? mapGear(equipment) : null,
      };
    },
    siteStats: async (): Promise<SiteStats> => {
      if (statsCache && Date.now() < statsCache.expiresAt) return statsCache.data;
      const data = await getSiteStats();
      statsCache = { data, expiresAt: Date.now() + 60_000 };
      return data;
    },

    zonePartitions: async (
      _: unknown,
      args: QueryZonePartitionsArgs
    ) => {
      try {
        return await WarcraftLogsService.getZonePartitions(args.zoneId);
      } catch {
        return [];
      }
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
