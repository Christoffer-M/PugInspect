import { config } from "../../../config/index.js";
import { fetcher } from "../../utils/fetcher.js";
import { RequestInit } from "node-fetch";
import {
  CharacterProfileQuery,
  CharacterProfileQueryVariables,
  InputMaybe,
} from "./generated/index.js";
import { CHARACTER_PROFILE } from "./queries/characterProfile.js";
import { GraphQLError } from "graphql";
import { Difficulty, Metric, RoleType } from "@repo/graphql-types";

export class WarcraftLogsService {
  private static endpoint = "https://www.warcraftlogs.com/api/v2/client";

  private static cachedToken: string | null = null;
  private static tokenExpiry: number | null = null;

  private static clientId = config.warcraftLogsClientId;
  private static clientSecret = config.warcraftLogsClientSecret;

  private static async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    if (this.cachedToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    const url = "https://www.warcraftlogs.com/oauth/token";

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Warcraft Logs client ID or secret not configured.");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch token: ${res.status} ${res.statusText}`);
    }

    const data: { access_token: string; expires_in: number } = await res.json();

    this.cachedToken = data.access_token;
    this.tokenExpiry = now + data.expires_in - 60;

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
    name: string,
    realm: string,
    region: string,
    role?: InputMaybe<RoleType>,
    metric?: InputMaybe<Metric>,
    difficulty?: InputMaybe<Difficulty>
  ): Promise<CharacterProfileQuery["characterData"]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("API token not configured.");

    const variables: CharacterProfileQueryVariables = {
      name,
      server: realm,
      region,
      zoneID: undefined,
      difficulty: this.mapDifficulty(difficulty),
      role,
      metric,
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

      return response.data.characterData;
    } catch (error) {
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
