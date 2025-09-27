import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
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
  { key: CharacterFieldKey.MythicPlusScoresBySeason, value: "current" },
  { key: CharacterFieldKey.MythicPlusBestRuns },
  { key: CharacterFieldKey.Gear },
  { key: CharacterFieldKey.RaidProgression },
];

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
      throw new Error("RaiderIO API key is not configured.");
    }

    const query: Record<string, string | number | boolean> = {
      term: args.searchString,
      region: args.region,
    };

    const url = this.buildUrlWithQueries(`${baseApiUrl}/search`, query);

    try {
      var response = await fetcher<RaiderIoCharacterSearchApiResponse>(
        url,
        options
      );
      const filteredMatches = response.matches.filter(
        (m) => m.type === "character"
      );

      return filteredMatches.map((r) => ({
        name: r.name,
        realm: r.data.realm.name,
        region: r.data.region.short_name,
      }));
    } catch (error) {
      console.log("error", error);

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
    args: QueryCharacterArgs
  ): Promise<RaiderIoCharacterApiResponse> {
    const { name, realm, region } = args;
    const options: RequestInit = {
      method: "GET",
    };

    const apiKey = config.raiderIoApiKey;
    if (!apiKey) {
      throw new Error("RaiderIO API key is not configured.");
    }

    const query: Record<string, string | number | boolean> = {
      name,
      realm,
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
      return response;
    } catch (error) {
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
