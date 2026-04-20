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
  InputMaybe,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";
import { ZONE_PARTITIONS } from "./queries/zone.js";
import { GraphQLError } from "graphql";
import {
  Difficulty,
  QueryCharacterArgs,
} from "@repo/graphql-types";

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

  private static profileFetchInFlight = new Map<
    string,
    Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }>
  >();

  // Circuit breaker: timestamp (ms) until which WCL calls are suppressed after a 429.
  private static wclCircuitOpenUntil: number | null = null;

  private static partitionCache = new Map<number, { partitions: ZonePartitionInfo[]; cachedAt: number }>();
  private static readonly PARTITION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  static async getZonePartitions(zoneId: number): Promise<ZonePartitionInfo[]> {
    const cached = this.partitionCache.get(zoneId);
    if (cached && Date.now() - cached.cachedAt < this.PARTITION_CACHE_TTL_MS) {
      return cached.partitions;
    }

    const token = await this.tokens.getToken();
    const body = JSON.stringify({
      query: ZONE_PARTITIONS.loc?.source.body,
      variables: { zoneID: zoneId } satisfies ZonePartitionsQueryVariables,
    });

    const res = await fetch("https://www.warcraftlogs.com/api/v2/client", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
    });

    if (!res.ok) {
      logger.warn("Failed to fetch zone partitions", { zoneId, status: res.status });
      return [];
    }

    const response = await res.json() as { data: ZonePartitionsQuery };
    const raw = response.data?.worldData?.zone?.partitions;

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
  }

  private static async getZoneDefaultPartition(zoneId: number): Promise<number | undefined> {
    const partitions = await this.getZonePartitions(zoneId);
    const def = partitions.find((p) => p.isDefault) ?? partitions[0];
    return def?.id;
  }

  private static mapDifficulty(
    difficulty?: InputMaybe<Difficulty>
  ): number | undefined {
    switch (difficulty) {
      case "LFR":
        return 1;
      case "Normal":
        return 3;
      case "Heroic":
        return 4;
      case "Mythic":
        return 5;
      default:
        return undefined;
    }
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false
  ): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }> {
    const { name, realm, region, role, metric, difficulty, byBracket, zoneId, partition: argPartition } = args;

    const normalizedRealm = normalizeRealm(realm);

    const partition = argPartition ?? (zoneId != null ? await this.getZoneDefaultPartition(zoneId) : undefined);
    const cacheKey = `wcl:${region}:${normalizedRealm}:${name}:${zoneId ?? ""}:${difficulty ?? ""}:${role ?? ""}:${metric ?? ""}:${byBracket ?? ""}:${partition ?? ""}`.toLowerCase();

    // Singleflight: deduplicate concurrent in-flight requests for the same key
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

  private static async acquireCharacterProfile(
    cacheKey: string,
    args: QueryCharacterArgs,
    normalizedRealm: string,
    bypassCache = false,
    partition: number | undefined = undefined
  ): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number }> {
    const { name, region, role, metric, difficulty, byBracket, zoneId } = args;

    if (!bypassCache) {
      const cached = await getCachedWclProfile(
        { region, realm: normalizedRealm, name },
        {
          zoneId: zoneId ?? 0,
          difficulty: difficulty ?? "",
          metric: metric ?? "",
          role: role ?? "",
          byBracket: byBracket ?? false,
          partition: partition ?? 0,
        }
      );
      if (cached) {
        logger.info("WarcraftLogs character profile cache hit", { name, realm: normalizedRealm, region });
        return cached;
      }
    }

    // Circuit breaker
    const circuitNow = Date.now();
    if (this.wclCircuitOpenUntil !== null && circuitNow < this.wclCircuitOpenUntil) {
      const retryAfterMs = this.wclCircuitOpenUntil - circuitNow;
      logger.warn("WCL_CIRCUIT_OPEN", { cacheKey, retryAfterMs });
      throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
        extensions: { code: "RATE_LIMITED", retryAfterMs },
      });
    }

    const token = await this.tokens.getToken();

    logger.info("WarcraftLogs character profile request", { name, realm: normalizedRealm, region, zoneId, partition });

    const body = JSON.stringify({
      query: CHARACTER_PROFILE.loc?.source.body,
      variables: {
        name,
        server: normalizedRealm,
        region,
        zoneID: zoneId ?? undefined,
        difficulty: this.mapDifficulty(difficulty),
        role,
        metric,
        byBracket,
        partition,
      } satisfies CharacterProfileQueryVariables,
    });

    const wclCallStart = Date.now();

    try {
      const wclRes = await fetch("https://www.warcraftlogs.com/api/v2/client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (wclRes.status === 429) {
        const durationMs = Date.now() - wclCallStart;
        const waitMs = 2 * 60 * 1000;
        this.wclCircuitOpenUntil = Date.now() + waitMs;
        logger.warn("WCL_CIRCUIT_OPENED", {
          cacheKey,
          durationMs,
          waitMs,
          openUntil: new Date(this.wclCircuitOpenUntil).toISOString(),
        });
        throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
          extensions: { code: "RATE_LIMITED", retryAfterMs: waitMs },
        });
      }

      if (!wclRes.ok) {
        throw new Error(`WCL request failed: ${wclRes.status} ${wclRes.statusText}`);
      }

      const response = await wclRes.json() as { data: CharacterProfileQuery };
      const durationMs = Date.now() - wclCallStart;
      const rateLimitInfo = response.data?.rateLimitData;

      const rateLimitHeaderInfo = {
        rateLimitRemaining: wclRes.headers.get("x-ratelimit-remaining"),
        rateLimitLimit: wclRes.headers.get("x-ratelimit-limit")
      };

      if (!response.data?.characterData?.character) {
        logger.warn("WarcraftLogs character not found", { name, realm: normalizedRealm, region, durationMs, rateLimit: rateLimitInfo, rateLimitHeaderInfo });
        return { data: null, fetchedAt: Math.floor(Date.now() / 1000) };
      }

      logger.info("WarcraftLogs character profile fetched", {
        name, realm: normalizedRealm, region, durationMs, rateLimit: rateLimitInfo, rateLimitHeaderInfo
      });
      const characterData = response.data.characterData;
      const fetchedAt = Math.floor(Date.now() / 1000);

      persistWclProfile(
        { region, realm: normalizedRealm, name },
        {
          zoneId: zoneId ?? 0,
          difficulty: difficulty ?? "",
          metric: metric ?? "",
          role: role ?? "",
          byBracket: byBracket ?? false,
          partition: partition ?? 0,
        },
        characterData,
        fetchedAt
      ).catch((err: unknown) => {
        logger.warn("Failed to persist WCL profile to DB cache", { name, realm: normalizedRealm, region, error: String(err) });
      });

      return { data: characterData, fetchedAt };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      logger.error("WarcraftLogs character profile fetch failed", {
        name,
        realm: normalizedRealm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError(
        "Failed to fetch character profile from Warcraft Logs",
        {
          extensions: { code: "NOT_FOUND" },
        }
      );
    }
  }
}
