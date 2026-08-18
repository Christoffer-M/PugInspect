import { config } from "../../../config/index.js";
import { RAID_PROGRESSION_FIELD } from "../../../generated/seasonConfig.js";
import { fetcher, FetchError } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";
import { normalizeRealm, normalizeName } from "../../utils/helpers.js";
import { getCachedRioProfile, persistRioProfile } from "../../../db/persistence.js";
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
  { key: CharacterFieldKey.RaidProgression, value: RAID_PROGRESSION_FIELD },
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

    const query: Record<string, string | number | boolean> = {
      term: args.searchString,
      region: args.region,
    };

    logger.debug("RaiderIO character suggestions request", { searchString: args.searchString, region: args.region });

    const url = this.buildUrlWithQueries(`${baseApiUrl}/search`, query);

    try {
      const response = await fetcher<RaiderIoCharacterSearchApiResponse>(
        url,
        options
      );
      const filteredMatches = response.matches.filter(
        (m) => m.type === "character"
      );

      logger.info("RaiderIO character suggestions fetched", { searchString: args.searchString, region: args.region, count: filteredMatches.length });
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
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        }
      );
    }
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false,
    cacheOnly = false
  ): Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }> {
    const { name, realm, region } = args;
    const options: RequestInit = {
      method: "GET",
    };

    const normalizedRealm = normalizeRealm(realm);
    const normalizedName = normalizeName(name);

    if (!bypassCache || cacheOnly) {
      const cached = await getCachedRioProfile({ region, realm: normalizedRealm, name: normalizedName }, cacheOnly);
      if (cached) {
        logger.debug("RaiderIO character profile cache hit", { name, realm, region });
        return cached;
      }
    }

    // Crawler traffic is served from cache only (stale allowed above) and must
    // never spend upstream API quota.
    if (cacheOnly) {
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    logger.info("RaiderIO character profile request", { normalizedName, normalizedRealm, region });

    const query: Record<string, string | number | boolean> = {
      name: normalizedName,
      realm: normalizedRealm,
      region,
      access_key: config.raiderIoApiKey,
      fields: fields
        .map((f) => `${f.key}${f.value ? `:${f.value}` : ""}`)
        .join(","),
    };

    const url = this.buildUrlWithQueries(
      `${baseUrl}/characters/profile`,
      query
    );

    try {
      const response = await fetcher<RaiderIoCharacterApiResponse>(url, options);
      const fetchedAt = Math.floor(Date.now() / 1000);
      logger.info("RaiderIO character profile fetched", { name, realm, region });
      persistRioProfile({ region, realm: normalizedRealm, name: normalizedName }, response, fetchedAt).catch((err: unknown) => {
        logger.warn("Failed to persist RIO profile to DB cache", { name, realm, region, error: String(err) });
      });
      return { data: response, fetchedAt };
    } catch (error) {
      // RaiderIO answers 400 for missing characters AND for malformed queries — the body
      // message ("Could not find requested character" / "Failed to find realm …") is the
      // only way to tell user input from our own bugs.
      if (
        error instanceof FetchError &&
        (error.status === 404 ||
          (error.status === 400 && /could not find|failed to find/i.test(error.apiMessage)))
      ) {
        logger.warn("RaiderIO character not found", { name, realm, region, apiMessage: error.apiMessage });
        throw new GraphQLError("Character not found on RaiderIO", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      logger.error("RaiderIO character profile fetch failed", {
        name,
        realm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError(
        "Failed to fetch character profile from RaiderIO",
        {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        }
      );
    }
  }
}
