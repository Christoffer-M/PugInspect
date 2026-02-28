import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";
import { getKV } from "../../../kv.js";
import { RequestInit } from "node-fetch";
import {
  CharacterProfileQuery,
  CharacterProfileQueryVariables,
  InputMaybe,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";
import { GraphQLError } from "graphql";
import {
  Difficulty,
  QueryCharacterArgs,
} from "@repo/graphql-types";

const logger = createLogger({ service: "WarcraftLogs" });
export class WarcraftLogsService {
  private static endpoint = "https://www.warcraftlogs.com/api/v2/client";

  private static cachedToken: string | null = null;
  private static tokenExpiry: number | null = null;
  private static tokenFetchInFlight: Promise<string> | null = null;

  private static clientId = config.warcraftLogsClientId;
  private static clientSecret = config.warcraftLogsClientSecret;

  private static async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Fast path: valid token already in this isolate's memory.
    if (this.cachedToken && this.tokenExpiry && now < this.tokenExpiry) {
      logger.info("WarcraftLogs token cache hit (memory)");
      return this.cachedToken;
    }

    // Deduplicate: if a fetch is already in flight within this isolate,
    // await it instead of firing a second request to the token endpoint.
    if (this.tokenFetchInFlight) {
      logger.info("WarcraftLogs token fetch already in progress, awaiting");
      return this.tokenFetchInFlight;
    }

    this.tokenFetchInFlight = this.acquireToken(now).finally(() => {
      this.tokenFetchInFlight = null;
    });

    return this.tokenFetchInFlight;
  }

  private static async acquireToken(now: number): Promise<string> {
    // KV path: token may have been fetched by another isolate already.
    const kv = getKV();
    if (kv) {
      const stored = await kv.get<{ token: string; expiry: number }>("wcl_oauth_token", "json");
      if (stored && stored.expiry > now) {
        logger.info("WarcraftLogs token cache hit (KV)");
        this.cachedToken = stored.token;
        this.tokenExpiry = stored.expiry;
        return stored.token;
      }
    }

    if (!this.clientId || !this.clientSecret) {
      logger.error("WarcraftLogs client credentials not configured");
      throw new Error("Warcraft Logs client ID or secret not configured.");
    }

    logger.info("Fetching new WarcraftLogs OAuth token");

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
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

    const data: { access_token: string; expires_in: number } = await res.json();
    const expiry = now + data.expires_in - 60;

    this.cachedToken = data.access_token;
    this.tokenExpiry = expiry;

    if (kv) {
      await kv.put(
        "wcl_oauth_token",
        JSON.stringify({ token: data.access_token, expiry }),
        { expirationTtl: data.expires_in - 60 }
      );
      logger.info("WarcraftLogs OAuth token acquired and persisted to KV", { expiresIn: data.expires_in });
    } else {
      logger.info("WarcraftLogs OAuth token acquired (no KV binding)", { expiresIn: data.expires_in });
    }

    return this.cachedToken;
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
    args: QueryCharacterArgs
  ): Promise<CharacterProfileQuery["characterData"]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("API token not configured.");

    const { name, realm, region, role, metric, difficulty, byBracket, zoneId } = args;

    logger.info("WarcraftLogs character profile request", { name, realm, region, zoneId });

    const variables: CharacterProfileQueryVariables = {
      name,
      server: realm,
      region,
      zoneID: zoneId ?? undefined,
      difficulty: this.mapDifficulty(difficulty),
      role,
      metric,
      byBracket,
    };


    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: CHARACTER_PROFILE.loc?.source.body,
        variables,
      }),
    };

    try {
      const response = await fetcher<{ data: CharacterProfileQuery }>(
        this.endpoint,
        options
      );

      const rateLimitInfo = response.data?.rateLimitData;

      if (!response.data?.characterData?.character) {
        logger.warn("WarcraftLogs character not found", { name, realm, region, rateLimit: rateLimitInfo });
        return null;
      }

      logger.info("WarcraftLogs character profile fetched", { name, realm, region, rateLimit: rateLimitInfo });
      return response.data.characterData;
    } catch (error) {
      logger.error("WarcraftLogs character profile fetch failed", {
        name,
        realm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError(
        "Failed to fetch character profile from Warcraft Logs",
        {
          extensions: {
            code: "NOT_FOUND",
            originalError: error instanceof Error ? error : undefined,
          },
        }
      );
    }
  }
}
