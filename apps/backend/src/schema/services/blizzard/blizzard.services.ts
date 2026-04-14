import { config } from "../../../config/index.js";
import { createLogger } from "../../utils/logger.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { normalizeRealm } from "../../utils/helpers.js";
import { getCachedBlizzardProfile, persistBlizzardProfile } from "../../../db/persistence.js";
import type { BlizzardCharacterProfile } from "./model/CharacterProfile.js";
import { GraphQLError } from "graphql";
import type { QueryCharacterArgs } from "@repo/graphql-types";

const logger = createLogger({ service: "Blizzard" });

export class BlizzardService {
  // Per-region token management: the manager keys by region automatically.
  private static readonly tokens = new OAuthTokenManager(async (region) => {
    logger.info("Fetching new Blizzard OAuth token", { region });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.blizzardClientId,
      client_secret: config.blizzardClientSecret,
    });

    const res = await fetch(`https://${region}.battle.net/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      logger.error("Blizzard token request failed", { region, status: res.status, statusText: res.statusText });
      throw new Error(`Failed to fetch Blizzard token: ${res.status} ${res.statusText}`);
    }

    logger.info("Blizzard OAuth token acquired", { region });
    return res.json() as Promise<{ access_token: string; expires_in: number }>;
  });

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false
  ): Promise<{ data: BlizzardCharacterProfile; fetchedAt: number }> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);

    if (!bypassCache) {
      const cached = await getCachedBlizzardProfile({ region, realm: normalizedRealm, name });
      if (cached) {
        logger.info("Blizzard character profile cache hit", { name, realm: normalizedRealm, region });
        return cached;
      }
    }

    const token = await this.tokens.getToken(region);

    const url = `https://${region}.api.blizzard.com/profile/wow/character/${normalizedRealm}/${name.toLowerCase()}?namespace=profile-${region}&locale=en_US`;

    logger.info("Blizzard character profile request", { name, realm: normalizedRealm, region });

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        logger.warn("Blizzard character not found", { name, realm: normalizedRealm, region });
        throw new GraphQLError("Character not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (!res.ok) {
        throw new Error(`Blizzard request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as BlizzardCharacterProfile;
      const fetchedAt = Math.floor(Date.now() / 1000);

      logger.info("Blizzard character profile fetched", { name, realm: normalizedRealm, region });

      persistBlizzardProfile({ region, realm: normalizedRealm, name }, data, fetchedAt).catch((err: unknown) => {
        logger.warn("Failed to persist Blizzard profile to DB cache", { name, realm: normalizedRealm, region, error: String(err) });
      });

      return { data, fetchedAt };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      logger.error("Blizzard character profile fetch failed", {
        name,
        realm: normalizedRealm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError("Failed to fetch character profile from Blizzard", {
        extensions: { code: "NOT_FOUND" },
      });
    }
  }
}
