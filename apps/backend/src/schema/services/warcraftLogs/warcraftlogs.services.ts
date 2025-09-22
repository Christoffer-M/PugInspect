import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
import { RequestInit } from "node-fetch";
import {
  CharacterProfileQuery,
  CharacterProfileQueryVariables,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";

export class WarcraftLogsService {
  private static endpoint = "https://www.warcraftlogs.com/api/v2/client";

  static async getCharacterProfile(
    name: string,
    realm: string,
    region: string
  ): Promise<CharacterProfileQuery["characterData"]> {
    const apiKey = config.warcraftLogsBearerToken;
    if (!apiKey) throw new Error("API key not configured.");

    const variables: CharacterProfileQueryVariables = {
      name,
      server: realm,
      region,
      zoneID: 44, // Example zone ID, replace with actual as needed
      difficulty: 4, // Example difficulty, replace with actual as needed
    };

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: CHARACTER_PROFILE.loc?.source.body,
        variables,
      }),
    };

    const response = await fetcher<{ data: CharacterProfileQuery }>(
      this.endpoint,
      options
    );

    const characterData = response.data.characterData;

    if (!characterData?.character)
      throw new Error("Character not found in Warcraft Logs");

    return characterData;
  }
}
