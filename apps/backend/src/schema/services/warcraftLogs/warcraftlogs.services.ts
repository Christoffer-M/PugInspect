import { trace } from "@opentelemetry/api";
import { config } from "../../../config/index.js";
import { createLogger } from "../../utils/logger.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { dedupeInFlight, normalizeRealm } from "../../utils/helpers.js";
import { markCache, markStale } from "../../utils/spans.js";
import { getCachedWclProfile, persistWclProfile, type CharacterKey, type WclQueryKey } from "../../../db/persistence.js";
import type {
  CharacterProfileQuery,
  CharacterProfileQueryVariables,
  MythicPlusZoneQuery,
  MythicPlusZoneQueryVariables,
  WclRateLimitQuery,
  ZonePartitionsQuery,
  ZonePartitionsQueryVariables,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";
import { ZONE_PARTITIONS } from "./queries/zone.js";
import {
  ENCOUNTER_RANKINGS_BOTH,
  ENCOUNTER_RANKINGS_DPS,
  MYTHIC_PLUS_ZONE,
  RATE_LIMIT,
} from "./queries/encounterRankings.js";
import type {
  CharacterRankingsPage,
  MythicPlusZone,
} from "./model/CharacterRankings.js";
import { GraphQLError } from "graphql";
import { QueryCharacterArgs } from "@repo/graphql-types";
import { mapDifficulty, buildProfileParams } from "./warcraftlogs.helpers.js";
import { isRateLimitError, WclGraphQLClient } from "./wclGraphQLClient.js";

export type ZonePartitionInfo = { id: number; name: string; compactName: string; isDefault: boolean };

type WclProfile = { data: CharacterProfileQuery["characterData"]; fetchedAt: number };

const logger = createLogger({ service: "WarcraftLogs" });

export class WarcraftLogsService {
  private static readonly tokens = new OAuthTokenManager(async () => {
    logger.info("Fetching new WarcraftLogs OAuth token");
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.warcraftLogsClientId,
      client_secret: config.warcraftLogsClientSecret,
    });
    const res = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      logger.error("WarcraftLogs token request failed", { status: res.status, statusText: res.statusText });
      throw new Error(`Failed to fetch token: ${res.status} ${res.statusText}`);
    }
    logger.info("WarcraftLogs OAuth token acquired");
    return res.json() as Promise<{ access_token: string; expires_in: number }>;
  });

  private static readonly client = new WclGraphQLClient(WarcraftLogsService.tokens);

  private static profileFetchInFlight = new Map<string, Promise<WclProfile>>();

  private static partitionCache = new Map<number, { partitions: ZonePartitionInfo[]; cachedAt: number }>();
  private static readonly PARTITION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  /** Whether the rate-limit circuit breaker is open (bulk callers skip WCL entirely). */
  static isCircuitOpen(): boolean {
    return this.client.isCircuitOpen();
  }

  /** Remaining rate-limit budget, so a crawl can yield to live lookups. */
  static async getRateLimit(): Promise<NonNullable<WclRateLimitQuery["rateLimitData"]> | null> {
    try {
      const { data } = await this.client.query<WclRateLimitQuery>(RATE_LIMIT, {});
      return data?.rateLimitData ?? null;
    } catch (error) {
      logger.warn("Failed to read WarcraftLogs rate limit", { error: String(error) });
      return null;
    }
  }

  /** Dungeon list and keystone bracket range for a Mythic+ season zone. */
  static async getMythicPlusZone(zoneId: number): Promise<MythicPlusZone | undefined> {
    const { data } = await this.client.query<MythicPlusZoneQuery>(
      MYTHIC_PLUS_ZONE,
      { zoneID: zoneId } satisfies MythicPlusZoneQueryVariables
    );
    return data?.worldData?.zone ?? undefined;
  }

  /**
   * One page of one spec's dungeon rankings — dps for damage specs and tanks,
   * both metrics for healers.
   */
  static async getEncounterRankings(
    encounterId: number,
    page: number,
    className: string,
    specName: string,
    metric: "dps" | "both"
  ): Promise<{ dps?: CharacterRankingsPage; hps?: CharacterRankingsPage }> {
    // characterRankings is an untyped JSON scalar, so the generated query
    // types say `any` — CharacterRankingsPage is the verified shape.
    const { data } = await this.client.query<{
      worldData?: { encounter?: { dps?: CharacterRankingsPage; hps?: CharacterRankingsPage } };
    }>(metric === "both" ? ENCOUNTER_RANKINGS_BOTH : ENCOUNTER_RANKINGS_DPS, {
      encounterID: encounterId,
      page,
      className,
      specName,
    });
    return data?.worldData?.encounter ?? {};
  }

  /** Never throws: an empty list just hides the partition picker. */
  static async getZonePartitions(zoneId: number): Promise<ZonePartitionInfo[]> {
    const cached = this.partitionCache.get(zoneId);
    if (cached && Date.now() - cached.cachedAt < this.PARTITION_CACHE_TTL_MS) {
      return cached.partitions;
    }

    try {
      const { data } = await this.client.query<ZonePartitionsQuery>(
        ZONE_PARTITIONS,
        { zoneID: zoneId } satisfies ZonePartitionsQueryVariables
      );

      const raw = data?.worldData?.zone?.partitions;
      if (!raw?.length) {
        logger.warn("No partitions found for zone", { zoneId });
        return [];
      }

      const partitions: ZonePartitionInfo[] = raw
        .filter((p): p is NonNullable<typeof p> => p != null)
        .map((p) => ({ id: p.id, name: p.name, compactName: p.compactName, isDefault: p.default }));

      logger.info("Fetched zone partitions", { zoneId, count: partitions.length });
      this.partitionCache.set(zoneId, { partitions, cachedAt: Date.now() });
      return partitions;
    } catch (error) {
      logger.warn("Failed to fetch zone partitions", { zoneId, error: String(error) });
      return [];
    }
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false,
    cacheOnly = false
  ): Promise<WclProfile> {
    const key: CharacterKey = { region: args.region, realm: normalizeRealm(args.realm), name: args.name };
    const params = buildProfileParams(args, args.partition ?? undefined);

    // Crawler traffic is served from cache only (stale allowed) and must
    // never spend upstream API quota.
    if (cacheOnly) {
      const cached = await getCachedWclProfile(key, params, true);
      markCache("wcl", cached ? "hit" : "miss");
      if (cached) return cached;
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    if (!bypassCache) {
      const cached = await getCachedWclProfile(key, params);
      if (cached) {
        markCache("wcl", "hit");
        return cached;
      }
    }
    markCache("wcl", "miss");

    // Derived from the same params as the DB row, so two requests share a
    // fetch exactly when they would share a snapshot.
    const inFlightKey = `wcl:${key.region}:${key.realm}:${key.name}:${Object.values(params).join(":")}`.toLowerCase();

    // Cache is checked above, outside the map — an in-flight entry is therefore
    // always a real upstream fetch, so even bypassCache callers can join it.
    return dedupeInFlight(this.profileFetchInFlight, inFlightKey, () => this.fetchProfile(args, key, params));
  }

  private static async fetchProfile(
    args: QueryCharacterArgs,
    key: CharacterKey,
    params: WclQueryKey
  ): Promise<WclProfile> {
    const { role, metric, difficulty, byBracket, zoneId, partition } = args;

    try {
      const { data } = await this.client.query<CharacterProfileQuery>(CHARACTER_PROFILE, {
        name: key.name,
        server: key.realm,
        region: key.region,
        zoneID: zoneId ?? undefined,
        difficulty: mapDifficulty(difficulty),
        role,
        metric,
        byBracket,
        partition: partition ?? undefined,
      } satisfies CharacterProfileQueryVariables);

      // Every profile response carries rateLimitData; shout well before the
      // quota is gone, since exhaustion trips the circuit breaker site-wide.
      const rl = data?.rateLimitData;
      if (rl) {
        trace.getActiveSpan()?.setAttributes({
          "app.wcl.rate_limit.points_spent": rl.pointsSpentThisHour,
          "app.wcl.rate_limit.limit_per_hour": rl.limitPerHour,
          "app.wcl.rate_limit.reset_in_s": rl.pointsResetIn,
        });
      }
      if (rl?.limitPerHour && rl.pointsSpentThisHour != null && rl.pointsSpentThisHour / rl.limitPerHour > 0.8) {
        logger.warn("WCL_QUOTA_HIGH", {
          pointsSpentThisHour: rl.pointsSpentThisHour,
          limitPerHour: rl.limitPerHour,
          pointsResetIn: rl.pointsResetIn,
        });
      }

      const fetchedAt = Math.floor(Date.now() / 1000);
      if (!data?.characterData?.character) return { data: null, fetchedAt };

      persistWclProfile(key, params, data.characterData, fetchedAt).catch((err: unknown) => {
        logger.warn("Failed to persist WCL profile to DB cache", { ...key, error: String(err) });
      });
      return { data: data.characterData, fetchedAt };
    } catch (error) {
      // Rate limits included — whether the circuit was already open or this
      // very request tripped it. The circuit stays open for minutes and applies
      // site-wide, so it is the one failure that blanks parses on every
      // character page at once; an expired snapshot beats an error.
      const rateLimited = isRateLimitError(error);
      if (rateLimited) trace.getActiveSpan()?.setAttribute("app.wcl.circuit_open", true);
      else trace.getActiveSpan()?.recordException(error as Error);

      const stale = await getCachedWclProfile(key, params, true);
      if (stale) {
        markStale("wcl", stale.fetchedAt);
        return stale;
      }

      if (rateLimited) throw error;
      throw new GraphQLError("Failed to fetch character profile from Warcraft Logs", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }
}
