import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";
import { getResponseKV } from "../../../kv.js";
import type { RequestInit } from "node-fetch";
import { GraphQLError } from "graphql";
import {
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
} from "@repo/graphql-types";
import { RaiderIoCharacterSearchApiResponse } from "./model/CharacterSearchResponse.js";
import { RaiderIoCharacterApiResponse } from "./model/CharacterApiResponse.js";

const baseUrl = "https://raider.io/api/v1";
const baseApiUrl = "https://raider.io/api";

export type CharacterSearchResponse = {
  name: string;
  realm: string;
  region: string;
};

enum CharacterFieldKey {
  MythicPlusScoresBySeason = "mythic_plus_scores_by_season",
  MythicPlusRanks = "mythic_plus_ranks",
  RaidProgression = "raid_progression",
  Gear = "gear",
  MythicPlusRecentRuns = "mythic_plus_recent_runs",
  MythicPlusHighestLevelRuns = "mythic_plus_highest_level_runs",
  MythicPlusAlternateRuns = "mythic_plus_alternate_runs",
  MythicPlusBestRuns = "mythic_plus_best_runs",
}

type CharacterField = {
  key: CharacterFieldKey;
  value?: string;
};

const fields: CharacterField[] = [
  { key: CharacterFieldKey.MythicPlusScoresBySeason, value: "current:previous" },
  { key: CharacterFieldKey.MythicPlusBestRuns },
  { key: CharacterFieldKey.Gear },
  { key: CharacterFieldKey.RaidProgression },
  { key: CharacterFieldKey.MythicPlusRecentRuns },
];

const logger = createLogger({ service: "RaiderIO" });

export class RaiderIOService {
  private static buildUrlWithQueries(
    baseUrl: string,
    queries: Record<string, string | number | boolean>
  ): string {
    const url = new URL(baseUrl);
    Object.entries(queries).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    return url.toString();
  }

  static async getCharacterSuggestions(
    args: QueryCharacterSuggestionsArgs
  ): Promise<CharacterSearchResponse[]> {
    const options: RequestInit = {
      method: "GET",
    };

    const apiKey = config.raiderIoApiKey;
    if (!apiKey) {
      logger.error("RaiderIO API key not configured");
      throw new Error("RaiderIO API key is not configured.");
    }

    const query: Record<string, string | number | boolean> = {
      term: args.searchString,
      region: args.region,
    };

    logger.info("RaiderIO character suggestions request", { searchString: args.searchString, region: args.region });

    const url = this.buildUrlWithQueries(`${baseApiUrl}/search`, query);

    try {
      var response = await fetcher<RaiderIoCharacterSearchApiResponse>(
        url,
        options
      );
      const filteredMatches = response.matches.filter(
        (m) => m.type === "character"
      );

      logger.info("RaiderIO character suggestions fetched", { count: filteredMatches.length });
      return filteredMatches.map((r) => ({
        name: r.name,
        realm: r.data.realm.name,
        region: r.data.region.short_name,
      }));
    } catch (error) {
      logger.error("RaiderIO character suggestions fetch failed", {
        searchString: args.searchString,
        region: args.region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError(
        "Failed to fetch character suggestions from RaiderIO",
        {
          extensions: {
            code: "NOT_FOUND",
            originalError: error instanceof Error ? error : undefined,
          },
        }
      );
    }
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false
  ): Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }> {
    const { name, realm, region } = args;
    const options: RequestInit = {
      method: "GET",
    };

    const apiKey = config.raiderIoApiKey;
    if (!apiKey) {
      logger.error("RaiderIO API key not configured");
      throw new Error("RaiderIO API key is not configured.");
    }

    // Remove all special characters and extra spaces from realm and name to prevent issues with the API, since it seems to be very picky about formatting
    const normalizedRealm = realm.trim().replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').toLowerCase();
    const normalizedName = name.trim().replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').toLowerCase();

    const cacheKey = `rio:${region}:${normalizedRealm}:${normalizedName}`.toLowerCase();
    const kv = getResponseKV();

    if (kv && !bypassCache) {
      const entry = await kv.get<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }>(cacheKey, "json");
      if (entry) {
        logger.info("RaiderIO character profile cache hit", { name, realm, region });
        return entry;
      }
    }

    logger.info("RaiderIO character profile request", { normalizedName, normalizedRealm, region });

    const query: Record<string, string | number | boolean> = {
      name: normalizedName,
      realm: normalizedRealm,
      region,
      access_key: apiKey,
      fields: fields
        .map((f) => `${f.key}${f.value ? `:${f.value}` : ""}`)
        .join(","),
    };

    const url = this.buildUrlWithQueries(
      `${baseUrl}/characters/profile`,
      query
    );

    try {
      var response = await fetcher<RaiderIoCharacterApiResponse>(url, options);
      const fetchedAt = Math.floor(Date.now() / 1000);
      logger.info("RaiderIO character profile fetched", { name, realm, region });
      if (kv) {
        await kv.put(cacheKey, JSON.stringify({ data: response, fetchedAt }), { expirationTtl: 900 });
      }
      return { data: response, fetchedAt };
    } catch (error) {
      logger.error("RaiderIO character profile fetch failed", {
        name,
        realm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError(
        "Failed to fetch character profile from RaiderIO",
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
