import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
import type { RequestInit } from "node-fetch";
import { CharacterApiResponse } from "./model/CharacterApiResponse.js";
import { GraphQLError } from "graphql";
import { QueryCharacterArgs } from "@repo/graphql-types";

const baseUrl = "https://raider.io/api/v1";

enum CharacterFieldKey {
  MythicPlusScoresBySeason = "mythic_plus_scores_by_season",
  MythicPlusRanks = "mythic_plus_ranks",
  RaidProgression = "raid_progression",
}

type CharacterField = {
  key: CharacterFieldKey;
  value?: string;
};

const fields: CharacterField[] = [
  { key: CharacterFieldKey.MythicPlusScoresBySeason, value: "current" },
  { key: CharacterFieldKey.MythicPlusRanks },
  { key: CharacterFieldKey.RaidProgression },
];

export class RaiderIOService {
  static async getCharacterProfile(
    args: QueryCharacterArgs
  ): Promise<CharacterApiResponse> {
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

    const url = buildUrlWithQueries(`${baseUrl}/characters/profile`, query);

    try {
      var response = await fetcher<CharacterApiResponse>(url, options);
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

const buildUrlWithQueries = (
  baseUrl: string,
  queries: Record<string, string | number | boolean>
): string => {
  const url = new URL(baseUrl);
  Object.entries(queries).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  return url.toString();
};
