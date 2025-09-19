import { config } from "../../../config/index.js";
import { buildUrlWithQueries, fetcher } from "../../utils/fetcher.js";
import type { RequestInit } from "node-fetch";
import { CharacterApiResponse } from "./model/CharacterApiResponse.js";

const baseUrl = "https://raider.io/api/v1";

enum CharacterFieldKey {
  MythicPlusScoresBySeason = "mythic_plus_scores_by_season",
  MythicPlusRanks = "mythic_plus_ranks",
}

type CharacterField = {
  key: CharacterFieldKey;
  value: string;
};

const fields: CharacterField[] = [
  { key: CharacterFieldKey.MythicPlusScoresBySeason, value: "current" },
  { key: CharacterFieldKey.MythicPlusRanks, value: "current" },
];

export class RaiderIOService {
  static async getCharacterProfile(
    name: string,
    realm: string,
    region: string
  ): Promise<CharacterApiResponse> {
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
    };

    if (fields && fields.length > 0) {
      query.fields = fields
        .map((field) => `${field.key}:${field.value}`)
        .join(",");
    }

    const url = buildUrlWithQueries(`${baseUrl}/characters/profile`, query);

    var response = await fetcher<CharacterApiResponse>(url, options);

    return response;
  }
}
