import { config } from "../../../config/index.js";
import { createLogger } from "../../utils/logger.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { normalizeRealm } from "../../utils/helpers.js";
import { getCachedBlizzardProfile, persistBlizzardProfile } from "../../../db/persistence.js";
import type { BlizzardCharacterMedia, BlizzardCharacterProfile } from "./model/CharacterProfile.js";
import { GraphQLError } from "graphql";
import type { QueryCharacterArgs } from "@repo/graphql-types";
import { VALID_REGIONS } from "../../utils/regions.js";

const logger = createLogger({ service: "Blizzard" });

export class BlizzardService {
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

  /** Exposed so sibling services (e.g. AchievementsService) can reuse the same token manager. */
  static async getToken(region: string): Promise<string> {
    return this.tokens.getToken(region);
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false
  ): Promise<{ data: BlizzardCharacterProfile; avatarUrl: string | null; fetchedAt: number; characterId: string | null }> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);

    // Defense in depth — the resolver validates region, but guard here too since this is a public static method
    if (!VALID_REGIONS.has(region.toLowerCase())) {
      throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
    }

    if (!bypassCache) {
      const cached = await getCachedBlizzardProfile({ region, realm: normalizedRealm, name });
      if (cached) {
        logger.info("Blizzard character profile cache hit", { name, realm: normalizedRealm, region });
        return cached; // already includes characterId
      }
    }

    const token = await this.tokens.getToken(region);
    const base = `https://${region}.api.blizzard.com/profile/wow/character/${normalizedRealm}/${name.toLowerCase()}`;
    const ns = `namespace=profile-${region}&locale=en_US`;

    logger.info("Blizzard character profile + media request", { name, realm: normalizedRealm, region });

    const [profileRes, mediaRes] = await Promise.allSettled([
      fetch(`${base}?${ns}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/character-media?${ns}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    try {
      if (profileRes.status === "rejected") throw profileRes.reason;

      const res = profileRes.value;
      if (res.status === 404) {
        logger.warn("Blizzard character not found", { name, realm: normalizedRealm, region });
        throw new GraphQLError("Character not found", { extensions: { code: "NOT_FOUND" } });
      }
      if (!res.ok) throw new Error(`Blizzard profile request failed: ${res.status} ${res.statusText}`);

      const data = await res.json() as BlizzardCharacterProfile;
      const fetchedAt = Math.floor(Date.now() / 1000);

      // Media is non-fatal — extract avatar URL if available
      let avatarUrl: string | null = null;
      if (mediaRes.status === "fulfilled" && mediaRes.value.ok) {
        const media = await mediaRes.value.json() as BlizzardCharacterMedia;
        avatarUrl = media.assets.find((a) => a.key === "avatar")?.value ?? null;
      } else {
        logger.warn("Blizzard character media fetch failed (non-fatal)", { name, realm: normalizedRealm, region });
      }

      logger.info("Blizzard character profile fetched", { name, realm: normalizedRealm, region });

      const characterId = await persistBlizzardProfile(
        { region, realm: normalizedRealm, name },
        data,
        fetchedAt,
        avatarUrl
      ).catch((err: unknown) => {
        logger.warn("Failed to persist Blizzard profile to DB cache", { name, realm: normalizedRealm, region, error: String(err) });
        return null;
      });

      return { data, avatarUrl, fetchedAt, characterId };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      logger.error("Blizzard character profile fetch failed", {
        name,
        realm: normalizedRealm,
        region,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError("Failed to fetch character profile from Blizzard", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }
}
