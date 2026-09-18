import { GraphQLError, GraphQLResolveInfo } from "graphql";
import {
  Character,
  Difficulty,
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
  QueryZonePartitionsArgs,
  RosterCharacterInput,
} from "@repo/graphql-types";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { mapBlizzardCharacter } from "../mappers/blizzard.mapper.js";
import { mapRecentRuns } from "../mappers/raiderIo.mapper.js";
import { ratingColor } from "../services/raiderIo/scoreTiers.service.js";
import type { StoredMythicPlusSeason } from "../services/blizzard/model/Progression.js";
import { mapRaidLogs } from "../mappers/raidLogs.mapper.js";
import { mapMythicPlusLogs } from "../mappers/mythicPlusLogs.mapper.js";
import { mapGear } from "../mappers/gear.mapper.js";
import {
  isAnyFieldRequestedBesides,
  isFieldRequested,
  isRosterCharacterFieldRequested,
} from "../utils/fetcher.js";
import type { CharacterSearchResponse } from "../services/raiderIo/raiderio.services.js";
import { AchievementsService } from "../services/blizzard/achievements.service.js";
import { getLinkedCharacters } from "../../db/persistence.js";
import { getCompanionTelemetry, type CompanionTelemetry } from "../../db/companionTelemetry.js";
import { config } from "../../config/index.js";
import { timingSafeEqual } from "crypto";
import {
  defaultZoneId,
  getMythicPlusSpecStats,
  type MythicPlusSpecStatsDto,
} from "../services/mythicPlusStats/mythicPlusStats.services.js";
import { getSiteStats, recordSearchEvent, type SiteStats } from "../../db/stats.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import { VALID_REGIONS } from "../utils/regions.js";
import { getRosterProfiles } from "../services/character/roster.service.js";
import { getCharacterSuggestions } from "../services/character/characterSuggestions.service.js";
import { getRosterBySlug, insertRoster, updateRosterCharacters } from "../../db/persistence.js";
import { normalizeName, resolveRealm } from "../utils/helpers.js";

/**
 * Return type for the Query.character resolver.
 * Omits fields handled by dedicated field resolvers (achievements, potentialAlts)
 * and adds the internal _characterId threaded to field resolvers.
 */
type CharacterWithMeta = Omit<Character, "achievements" | "potentialAlts"> & { _characterId: string | null };

/** Set per-request in the Apollo context (see index.ts). Optional so tests without a context still work. */
type GraphQLContext = { isBot?: boolean };

type Profiles = Awaited<ReturnType<typeof getCharacterProfiles>>;

/** Assemble the GraphQL Character from upstream profiles - shared by
 *  Query.character and Query.rosterCharacters. */
function buildCharacter(
  key: { name: string; realm: string; region: string },
  { blizzardProfile, blizzardAvatarUrl, rioProfile, progression, warcraftLogsProfile, characterId, equipment }: Profiles,
  requested: { raidLogs: boolean; mythicPlusLogs: boolean; gear: boolean }
): CharacterWithMeta {
  return {
    name: blizzardProfile?.name ?? key.name,
    realm: blizzardProfile?.realm.name ?? key.realm,
    realmSlug: blizzardProfile?.realm.slug ?? key.realm,
    region: key.region,
    // Internal field - not in the GraphQL schema, used by field resolvers below
    _characterId: characterId ?? null,
    ...(blizzardProfile ? mapBlizzardCharacter(blizzardProfile, blizzardAvatarUrl ?? null) : {}),
    mythicPlus: progression?.mythicPlus ?? null,
    raidProgression: progression?.raidProgression ?? null,
    recentMythicPlusRuns: rioProfile ? mapRecentRuns(rioProfile) : null,
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
    .map((c) => ({ name: normalizeName(c.name), realm: resolveRealm(c.realm, region) }))
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
let telemetryCache: { data: CompanionTelemetry; expiresAt: number } | null = null;

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

      // Canonicalise the key here, at the boundary: services, the DB write
      // and the not-found echo below all read it off args, and the characters
      // unique index is case-sensitive. Resolving once here is what keeps a
      // client's "TarrenMill" or "Стоуфилд" from becoming its own row.
      // rosterCharacters and validateRosterInput normalize the same way.
      args = {
        ...args,
        name: normalizeName(args.name),
        realm: resolveRealm(args.realm, args.region),
        region: args.region.toLowerCase(),
      };

      // Crawlers render the SPA and fire the same queries real users do; serve
      // them from the DB cache only (stale allowed) so bot crawls never spend
      // upstream API quota.
      const cacheOnly = context?.isBot === true;

      const raidLogsRequested = isFieldRequested(info, "raidLogs");
      const mythicPlusLogsRequested = isFieldRequested(info, "mythicPlusLogs");
      const progressionRequested =
        isFieldRequested(info, "mythicPlus") || isFieldRequested(info, "raidProgression");
      const recentRunsRequested = isFieldRequested(info, "recentMythicPlusRuns");
      const gearRequested = isFieldRequested(info, "gear");
      const blizzardRequested = isAnyFieldRequestedBesides(
        info,
        new Set(["mythicPlus", "raidProgression", "recentMythicPlusRuns", "raidLogs", "mythicPlusLogs", "gear"])
      );

      const profiles = await getCharacterProfiles(args, {
          raidLogsRequested,
          mythicPlusLogsRequested,
          progressionRequested,
          recentRunsRequested,
          blizzardRequested,
          gearRequested,
          bypassCache: !cacheOnly && (args.bypassCache ?? false),
          cacheOnly,
        });
      const { characterId } = profiles;

      // Search analytics — only the identity query (blizzard fields) counts as
      // a "search", so the progression/raidLogs/mythicPlusLogs follow-up queries a
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
        profiles,
        {
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
        characters: RosterCharacterInput[];
        difficulty?: Difficulty | null;
        zoneId?: number | null;
      },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      if (!VALID_REGIONS.has(args.region.toLowerCase())) {
        throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
      }
      // The companion's main path, and it does not go through
      // validateRosterInput — canonicalise here too or a stale client table
      // writes bad realms straight to the DB.
      args = {
        ...args,
        characters: args.characters.map((c) => ({
          ...c,
          realm: resolveRealm(c.realm, args.region),
        })),
      };
      // Only spend upstream quota on what the selection set actually asks
      // for - an identity-only query must not trigger 10 progression + WCL lookups.
      const progressionRequested =
        isRosterCharacterFieldRequested(info, "mythicPlus") ||
        isRosterCharacterFieldRequested(info, "raidProgression");
      const raidLogsRequested = isRosterCharacterFieldRequested(info, "raidLogs");
      // M+ parses come from the same zone-scoped WCL profile; the caller picks
      // the zone via zoneId (the companion passes the season's M+ zone).
      const mythicPlusLogsRequested = isRosterCharacterFieldRequested(info, "mythicPlusLogs");
      // No recordSearchEvent / alt enrichment here: a roster view isn't a
      // "search", and 30 background achievement fetches per view is real load.
      const bundles = await getRosterProfiles(args, {
        cacheOnly: context?.isBot === true,
        progressionRequested,
        raidLogsRequested,
        mythicPlusLogsRequested,
      });
      return bundles.map(({ name, realm, role, profiles }) => {
        const notFound = !profiles.blizzardProfile && !profiles.progression;
        const blizz = profiles.blizzardProfile;
        return {
          name: blizz?.name ?? name,
          realm: blizz?.realm.name ?? realm,
          realmSlug: blizz?.realm.slug ?? realm,
          notFound,
          role,
          character: notFound
            ? null
            : buildCharacter({ name, realm, region: args.region }, profiles, {
                raidLogs: raidLogsRequested,
                mythicPlusLogs: mythicPlusLogsRequested,
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

    companionTelemetry: async (_: unknown, args: { token: string }): Promise<CompanionTelemetry> => {
      // Unset token means the field is permanently forbidden rather than open —
      // a deploy that forgets the variable must not publish install data.
      const expected = config.companionTelemetryToken;
      const supplied = Buffer.from(args.token);
      if (
        !expected ||
        supplied.length !== Buffer.byteLength(expected) ||
        !timingSafeEqual(supplied, Buffer.from(expected))
      ) {
        throw new GraphQLError("Invalid telemetry token", { extensions: { code: "FORBIDDEN" } });
      }
      if (telemetryCache && Date.now() < telemetryCache.expiresAt) return telemetryCache.data;
      const data = await getCompanionTelemetry();
      telemetryCache = { data, expiresAt: Date.now() + 60_000 };
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

      return await getCharacterSuggestions(args);
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

  // Derived on read, never stored: Raider.IO's scale moves during a season.
  MythicPlusSeason: {
    color: (season: StoredMythicPlusSeason) => ratingColor(season.season, season.rating),
  },
};
