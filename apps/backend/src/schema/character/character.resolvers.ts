import { GraphQLError, GraphQLResolveInfo } from "graphql";
import {
  Character,
  Difficulty,
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
import {
  isAnyFieldRequestedBesides,
  isFieldRequested,
  isRosterCharacterFieldRequested,
} from "../utils/fetcher.js";
import {
  CharacterSearchResponse,
  RaiderIOService,
} from "../services/raiderIo/raiderio.services.js";
import { AchievementsService } from "../services/blizzard/achievements.service.js";
import { getLinkedCharacters } from "../../db/persistence.js";
import {
  defaultZoneId,
  getMythicPlusSpecStats,
  type MythicPlusSpecStatsDto,
} from "../services/mythicPlusStats/mythicPlusStats.services.js";
import { getSiteStats, recordSearchEvent, type SiteStats } from "../../db/stats.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import { VALID_REGIONS } from "../utils/regions.js";
import { getRosterProfiles } from "../services/character/roster.service.js";
import { getRosterBySlug, insertRoster, updateRosterCharacters } from "../../db/persistence.js";
import { normalizeName, normalizeRealm } from "../utils/helpers.js";

/**
 * Return type for the Query.character resolver.
 * Omits fields handled by dedicated field resolvers (achievements, potentialAlts)
 * and adds the internal _characterId threaded to field resolvers.
 */
type CharacterWithMeta = Omit<Character, "achievements" | "potentialAlts"> & { _characterId: string | null };

/** Set per-request in the Apollo context (see index.ts). Optional so tests without a context still work. */
type GraphQLContext = { isBot?: boolean };

type Profiles = Awaited<ReturnType<typeof getCharacterProfiles>>;

/** Assemble the GraphQL Character from upstream profiles — shared by
 *  Query.character and Query.rosterCharacters. */
function buildCharacter(
  key: { name: string; realm: string; region: string },
  { blizzardProfile, blizzardAvatarUrl, rioProfile, warcraftLogsProfile, characterId, equipment }: Profiles,
  requested: { raiderIo: boolean; raidLogs: boolean; mythicPlusLogs: boolean; gear: boolean }
): CharacterWithMeta {
  return {
    name: blizzardProfile?.name ?? key.name,
    realm: blizzardProfile?.realm.name ?? key.realm,
    region: key.region,
    // Internal field — not in the GraphQL schema, used by field resolvers below
    _characterId: characterId ?? null,
    ...(blizzardProfile ? mapBlizzardCharacter(blizzardProfile, blizzardAvatarUrl ?? null) : {}),
    raiderIo: requested.raiderIo && rioProfile ? mapRaiderIo(rioProfile) : null,
    raidLogs: requested.raidLogs && warcraftLogsProfile ? mapRaidLogs(warcraftLogsProfile) : null,
    mythicPlusLogs:
      requested.mythicPlusLogs && warcraftLogsProfile ? mapMythicPlusLogs(warcraftLogsProfile) : null,
    gear: requested.gear && equipment ? mapGear(equipment) : null,
  };
}

/** Shared by createRoster and updateRoster: region check + normalize, dedupe
 *  and cap the character list. */
function validateRosterInput(args: {
  region: string;
  characters: { name: string; realm: string }[];
}): { region: string; chars: { name: string; realm: string }[] } {
  const region = args.region.toLowerCase();
  if (!VALID_REGIONS.has(region)) {
    throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
  }
  const seen = new Set<string>();
  const chars = args.characters
    .map((c) => ({ name: normalizeName(c.name), realm: normalizeRealm(c.realm) }))
    .filter((c) => {
      const key = `${c.name}:${c.realm}`;
      if (!c.name || !c.realm || c.name.length > 50 || c.realm.length > 100 || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  if (chars.length < 1 || chars.length > 30) {
    throw new GraphQLError("characters must contain 1–30 valid entries", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  return { region, chars };
}

// ponytail: module-level 60s cache — stats are count queries, no need to hit
// the DB per request. Move to a shared cache layer if more queries need it.
const specStatsCache = new Map<number, { data: MythicPlusSpecStatsDto | null; expiresAt: number }>();
let statsCache: { data: SiteStats; expiresAt: number } | null = null;

export default {
  Query: {
    character: async (
      _: unknown,
      args: QueryCharacterArgs,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ): Promise<CharacterWithMeta> => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Crawlers render the SPA and fire the same queries real users do; serve
      // them from the DB cache only (stale allowed) so bot crawls never spend
      // upstream API quota.
      const cacheOnly = context?.isBot === true;

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
          bypassCache: !cacheOnly && (args.bypassCache ?? false),
          cacheOnly,
        });

      // Search analytics — only the identity query (blizzard fields) counts as
      // a "search", so the raiderIo/raidLogs/mythicPlusLogs follow-up queries a
      // page view issues don't multi-count. Fire-and-forget. Crawler visits
      // aren't searches.
      if (characterId && blizzardRequested && !cacheOnly) {
        // recordSearchEvent swallows its own errors — safe to not await
        void recordSearchEvent(characterId);
      }

      // Background alt detection — fire-and-forget, never blocks the response.
      // Skipped for crawlers: it fetches achievements from Blizzard upstream.
      if (characterId && !cacheOnly) {
        AchievementsService.enrichAndLinkAlts(characterId, {
          name: args.name,
          realm: args.realm,
          region: args.region,
        }).catch(() => {
          // Silently swallow — alt detection is best-effort
        });
      }

      return buildCharacter(
        args,
        { blizzardProfile, blizzardAvatarUrl, rioProfile, warcraftLogsProfile, characterId, equipment },
        {
          raiderIo: raiderIoRequested,
          raidLogs: raidLogsRequested,
          mythicPlusLogs: mythicPlusLogsRequested,
          gear: gearRequested,
        }
      );
    },
    roster: async (_: unknown, args: { region: string; slug: string }) => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
      }
      return getRosterBySlug(args.region.toLowerCase(), args.slug);
    },

    rosterCharacters: async (
      _: unknown,
      args: {
        region: string;
        characters: { name: string; realm: string }[];
        difficulty?: Difficulty | null;
        zoneId?: number | null;
      },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
      }
      // Only spend upstream quota on what the selection set actually asks
      // for — an identity-only query must not trigger 10 RIO + WCL lookups.
      const raiderIoRequested = isRosterCharacterFieldRequested(info, "raiderIo");
      const raidLogsRequested = isRosterCharacterFieldRequested(info, "raidLogs");
      // No recordSearchEvent / alt enrichment here: a roster view isn't a
      // "search", and 30 background achievement fetches per view is real load.
      const bundles = await getRosterProfiles(args, {
        cacheOnly: context?.isBot === true,
        raiderIoRequested,
        raidLogsRequested,
      });
      return bundles.map(({ name, realm, role, profiles }) => {
        const notFound = !profiles.blizzardProfile && !profiles.rioProfile;
        const blizz = profiles.blizzardProfile;
        return {
          name: blizz?.name ?? name,
          realm: blizz?.realm.name ?? realm,
          notFound,
          role,
          character: notFound
            ? null
            : buildCharacter({ name, realm, region: args.region }, profiles, {
                raiderIo: raiderIoRequested,
                raidLogs: raidLogsRequested,
                mythicPlusLogs: false,
                gear: false,
              }),
        };
      });
    },

    siteStats: async (): Promise<SiteStats> => {
      if (statsCache && Date.now() < statsCache.expiresAt) return statsCache.data;
      const data = await getSiteStats();
      statsCache = { data, expiresAt: Date.now() + 60_000 };
      return data;
    },

    mythicPlusSpecStats: async (_: unknown, args: { zoneId?: number | null }) => {
      const zoneId = args.zoneId ?? defaultZoneId();
      if (zoneId == null) return null;
      // Same memo pattern as siteStats: the data changes hourly, and the DTO
      // build is two DB queries plus sorting — no reason to redo it per request.
      const cached = specStatsCache.get(zoneId);
      if (cached && Date.now() < cached.expiresAt) return cached.data;
      const data = await getMythicPlusSpecStats(zoneId);
      specStatsCache.set(zoneId, { data, expiresAt: Date.now() + 60_000 });
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

  Mutation: {
    createRoster: async (
      _: unknown,
      args: { region: string; characters: { name: string; realm: string }[] }
    ) => {
      const { region, chars } = validateRosterInput(args);
      const { slug, editSecret } = await insertRoster(region, chars);
      return { slug, region, characters: chars, editSecret };
    },

    updateRoster: async (
      _: unknown,
      args: {
        region: string;
        slug: string;
        editSecret: string;
        characters: { name: string; realm: string }[];
      }
    ) => {
      const { region, chars } = validateRosterInput(args);
      const updated = await updateRosterCharacters(region, args.slug, args.editSecret, chars);
      if (!updated) {
        // Wrong secret and unknown slug are deliberately the same error.
        throw new GraphQLError("Roster not found or edit secret invalid", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      return updated;
    },
  },

  Character: {
    potentialAlts: async (parent: CharacterWithMeta) => {
      if (!parent._characterId) return [];
      return getLinkedCharacters(parent._characterId);
    },
  },
};
