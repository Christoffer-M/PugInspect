import { config } from "../../../config/index.js";
import { createLogger } from "../../utils/logger.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { normalizeRealm } from "../../utils/helpers.js";
import { getCachedWclProfile, persistWclProfile } from "../../../db/persistence.js";
import {
  CharacterProfileQuery,
  CharacterProfileQueryVariables,
  ZonePartitionsQuery,
  ZonePartitionsQueryVariables,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";
import { ZONE_PARTITIONS } from "./queries/zone.js";
import { GraphQLError } from "graphql";
import { QueryCharacterArgs } from "@repo/graphql-types";
import { mapDifficulty, buildProfileParams } from "./warcraftlogs.helpers.js";
import { WclGraphQLClient } from "./wclGraphQLClient.js";

export type ZonePartitionInfo = { id: number; name: string; compactName: string; isDefault: boolean };

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

  private static profileFetchInFlight = new Map<
    string,
    Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }>
  >();

  private static partitionCache = new Map<number, { partitions: ZonePartitionInfo[]; cachedAt: number }>();
  private static readonly PARTITION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  static async getZonePartitions(zoneId: number): Promise<ZonePartitionInfo[]> {
    const cached = this.partitionCache.get(zoneId);
    if (cached && Date.now() - cached.cachedAt < this.PARTITION_CACHE_TTL_MS) {
      return cached.partitions;
    }

    if (this.client.isCircuitOpen()) {
      logger.warn("WCL_CIRCUIT_OPEN: skipping partition fetch", { zoneId, retryAfterMs: this.client.circuitRetryAfterMs() });
      return [];
    }

    try {
      const { data } = await this.client.query<ZonePartitionsQuery>(
        ZONE_PARTITIONS.loc?.source.body ?? "",
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

  private static async getZoneDefaultPartition(zoneId: number): Promise<number | undefined> {
    const partitions = await this.getZonePartitions(zoneId);
    const def = partitions.find((p) => p.isDefault) ?? partitions[0];
    return def?.id;
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false
  ): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }> {
    const { name, realm, region, zoneId, partition: argPartition } = args;
    const normalizedRealm = normalizeRealm(realm);
    const partition = argPartition ?? (zoneId != null ? await this.getZoneDefaultPartition(zoneId) : undefined);
    const cacheKey = `wcl:${region}:${normalizedRealm}:${name}:${zoneId ?? ""}:${args.difficulty ?? ""}:${args.role ?? ""}:${args.metric ?? ""}:${args.byBracket ?? ""}:${partition ?? ""}`.toLowerCase();

    if (!bypassCache) {
      const inFlight = this.profileFetchInFlight.get(cacheKey);
      if (inFlight) {
        logger.info("WarcraftLogs profile fetch already in flight, awaiting", { name, realm, region });
        return inFlight;
      }
      const promise = this.acquireCharacterProfile(cacheKey, args, normalizedRealm, false, partition).finally(() => {
        this.profileFetchInFlight.delete(cacheKey);
      });
      this.profileFetchInFlight.set(cacheKey, promise);
      return promise;
    }

    return this.acquireCharacterProfile(cacheKey, args, normalizedRealm, bypassCache, partition);
  }

  private static async checkCacheOrNull(
    args: QueryCharacterArgs,
    normalizedRealm: string,
    partition: number | undefined
  ) {
    return getCachedWclProfile(
      { region: args.region, realm: normalizedRealm, name: args.name },
      buildProfileParams(args, partition)
    );
  }

  private static async executeWclRequest(
    args: QueryCharacterArgs,
    normalizedRealm: string,
    partition: number | undefined
  ): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }> {
    const { name, region, role, metric, difficulty, byBracket, zoneId } = args;

    logger.info("WarcraftLogs character profile request", { name, realm: normalizedRealm, region, zoneId, partition });

    const start = Date.now();
    const { data, headers } = await this.client.query<CharacterProfileQuery>(
      CHARACTER_PROFILE.loc?.source.body ?? "",
      {
        name,
        server: normalizedRealm,
        region,
        zoneID: zoneId ?? undefined,
        difficulty: mapDifficulty(difficulty),
        role,
        metric,
        byBracket,
        partition,
      } satisfies CharacterProfileQueryVariables
    );

    const durationMs = Date.now() - start;
    const rateLimitHeaderInfo = {
      rateLimitRemaining: headers.get("x-ratelimit-remaining"),
      rateLimitLimit: headers.get("x-ratelimit-limit"),
    };

    if (!data?.characterData?.character) {
      logger.warn("WarcraftLogs character not found", { name, realm: normalizedRealm, region, durationMs, rateLimit: data?.rateLimitData, rateLimitHeaderInfo });
      return { data: null, fetchedAt: Math.floor(Date.now() / 1000) };
    }

    logger.info("WarcraftLogs character profile fetched", { name, realm: normalizedRealm, region, durationMs, rateLimit: data?.rateLimitData, rateLimitHeaderInfo });
    return { data: data.characterData, fetchedAt: Math.floor(Date.now() / 1000) };
  }

  private static persistAsync(
    args: QueryCharacterArgs,
    normalizedRealm: string,
    partition: number | undefined,
    characterData: NonNullable<CharacterProfileQuery["characterData"]>,
    fetchedAt: number
  ): void {
    persistWclProfile(
      { region: args.region, realm: normalizedRealm, name: args.name },
      buildProfileParams(args, partition),
      characterData,
      fetchedAt
    ).catch((err: unknown) => {
      logger.warn("Failed to persist WCL profile to DB cache", { name: args.name, realm: normalizedRealm, region: args.region, error: String(err) });
    });
  }

  private static async acquireCharacterProfile(
    cacheKey: string,
    args: QueryCharacterArgs,
    normalizedRealm: string,
    bypassCache = false,
    partition: number | undefined = undefined
  ): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }> {
    if (!bypassCache) {
      const cached = await this.checkCacheOrNull(args, normalizedRealm, partition);
      if (cached) {
        logger.info("WarcraftLogs character profile cache hit", { name: args.name, realm: normalizedRealm, region: args.region });
        return cached;
      }
    }

    if (this.client.isCircuitOpen()) {
      const retryAfterMs = this.client.circuitRetryAfterMs();
      logger.warn("WCL_CIRCUIT_OPEN", { cacheKey, retryAfterMs });
      throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
        extensions: { code: "RATE_LIMITED", retryAfterMs },
      });
    }

    try {
      const result = await this.executeWclRequest(args, normalizedRealm, partition);
      if (result.data) {
        this.persistAsync(args, normalizedRealm, partition, result.data, result.fetchedAt);
      }
      return result;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      logger.error("WarcraftLogs character profile fetch failed", {
        name: args.name,
        realm: normalizedRealm,
        region: args.region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError("Failed to fetch character profile from Warcraft Logs", {
        extensions: { code: "NOT_FOUND" },
      });
    }
  }
}
