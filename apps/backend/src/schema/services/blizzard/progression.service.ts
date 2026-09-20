import { trace } from "@opentelemetry/api";
import { GraphQLError } from "graphql";
import type { QueryCharacterArgs } from "@repo/graphql-types";
import { BlizzardService } from "./blizzard.services.js";
import { dedupeInFlight, normalizeRealm } from "../../utils/helpers.js";
import { markCache, markStale } from "../../utils/spans.js";
import { characterKey, isMissingCharacter, markMissingCharacter } from "../../utils/missingCharacters.js";
import { VALID_REGIONS } from "../../utils/regions.js";
import { getCachedProgression, persistProgression } from "../../../db/persistence.js";
import { mapBlizzardProgression } from "../../mappers/blizzardProgression.mapper.js";
import type {
  BlizzardKeystoneSeason,
  BlizzardRaidEncounters,
  BlizzardSeasonIndex,
  CharacterProgression,
} from "./model/Progression.js";

// Same bound as BlizzardService: a hung fetch would pin the in-flight entry.
const UPSTREAM_TIMEOUT_MS = 10_000;
const SEASON_INDEX_TTL_MS = 3_600_000;

type Result = { data: CharacterProgression; fetchedAt: number };

/**
 * Mythic+ rating, best runs and raid progression from Blizzard: three parallel
 * ~150ms calls, where a cold Raider.IO profile took ~1s. Only recent runs still
 * come from Raider.IO — Blizzard has no run history.
 */
export class ProgressionService {
  private static readonly inFlight = new Map<string, Promise<Result>>();
  private static readonly seasonIds = new Map<string, { current: number; previous: number | null; expiresAt: number }>();

  static async getProgression(args: QueryCharacterArgs, bypassCache = false, cacheOnly = false): Promise<Result> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);

    // Defense in depth — the region lands in the upstream hostname
    if (!VALID_REGIONS.has(region.toLowerCase())) {
      throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
    }

    if (!bypassCache || cacheOnly) {
      const cached = await getCachedProgression({ region, realm: normalizedRealm, name }, cacheOnly);
      if (cached) {
        markCache("blizzard_progression", "hit");
        return cached;
      }
    }
    markCache("blizzard_progression", "miss");

    // Crawler traffic is served from cache only and must never spend upstream quota.
    if (cacheOnly) {
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    const key = characterKey(region, normalizedRealm, name);
    if (!bypassCache && isMissingCharacter(key)) {
      markCache("blizzard_progression", "missing");
      throw new GraphQLError("Character not found", { extensions: { code: "NOT_FOUND" } });
    }

    return dedupeInFlight(this.inFlight, key, () => this.fetchProfile(region, normalizedRealm, name));
  }

  private static async fetchProfile(region: string, realm: string, name: string): Promise<Result> {
    try {
      // Inside the try so a token or season-index failure reaches the stale fallback.
      const token = await BlizzardService.getToken();
      const seasons = await this.getSeasonIds(region, token);
      const base = `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${name.toLowerCase()}`;
      const ns = `namespace=profile-${region}&locale=en_US`;

      const [currentSeason, previousSeason, raids] = await Promise.all([
        getJson<BlizzardKeystoneSeason>(`${base}/mythic-keystone-profile/season/${seasons.current}?${ns}`, token),
        seasons.previous
          ? getJson<BlizzardKeystoneSeason>(`${base}/mythic-keystone-profile/season/${seasons.previous}?${ns}`, token)
          : null,
        getJson<BlizzardRaidEncounters>(`${base}/encounters/raids?${ns}`, token),
      ]);
      // A season 404 only means no keys that season; a raids 404 means no character.
      if (!raids) {
        markMissingCharacter(characterKey(region, realm, name));
        throw new GraphQLError("Character not found", { extensions: { code: "NOT_FOUND" } });
      }

      const data = mapBlizzardProgression({ currentSeason, previousSeason, raids });
      const fetchedAt = Math.floor(Date.now() / 1000);
      // persistProgression catches and logs its own failures — cache writes are non-fatal
      await persistProgression({ region, realm, name }, data, fetchedAt);
      return { data, fetchedAt };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      trace.getActiveSpan()?.recordException(error as Error);

      // The header's rating and raid progress come from here; a 15-minute-stale
      // snapshot beats blanking them on a Blizzard blip.
      const stale = await getCachedProgression({ region, realm, name }, true);
      if (stale) {
        markStale("blizzard_progression", stale.fetchedAt);
        return stale;
      }

      throw new GraphQLError("Failed to fetch progression from Blizzard", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  /** Current and previous season ids. Not current-1: Blizzard's ids skip (…15, 17, 18). */
  private static async getSeasonIds(region: string, token: string) {
    const cached = this.seasonIds.get(region);
    if (cached && Date.now() < cached.expiresAt) return cached;

    const index = await getJson<BlizzardSeasonIndex>(
      `https://${region}.api.blizzard.com/data/wow/mythic-keystone/season/index?namespace=dynamic-${region}&locale=en_US`,
      token
    );
    if (!index) throw new Error("Blizzard season index not found");
    const current = index.current_season.id;
    const older = index.seasons.map((s) => s.id).filter((id) => id < current);
    const ids = {
      current,
      previous: older.length ? Math.max(...older) : null,
      expiresAt: Date.now() + SEASON_INDEX_TTL_MS,
    };
    this.seasonIds.set(region, ids);
    return ids;
  }
}

/** null on 404, throws on any other failure. */
async function getJson<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blizzard request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}
