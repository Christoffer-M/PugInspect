import { config } from "../../../config/index.js";
import { createLogger } from "../../utils/logger.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { dedupeInFlight, normalizeRealm, startTimer } from "../../utils/helpers.js";
import { getCachedBlizzardProfile, persistBlizzardProfile, getCachedEquipment, persistEquipment } from "../../../db/persistence.js";
import type { BlizzardCharacterMedia, BlizzardCharacterProfile } from "./model/CharacterProfile.js";
import type { BlizzardCharacterEquipment, BlizzardItemMedia } from "./model/CharacterEquipment.js";
import { GraphQLError } from "graphql";
import type { QueryCharacterArgs } from "@repo/graphql-types";
import { VALID_REGIONS } from "../../utils/regions.js";

const logger = createLogger({ service: "Blizzard" });

// Item icons are immutable static data — cache per process. Bounded in practice
// (a few thousand distinct item ids per season, ~100 bytes each). Only successes
// are cached; failures stay null in that snapshot and self-heal on next refresh.
// ponytail: in-memory cache re-warms after restart (≤16 parallel fetches per
// character); move to a DB table if Blizzard rate limits ever complain.
const itemIconCache = new Map<number, string>();

// With in-flight dedup, a hung fetch would hang every joined caller and pin
// the map entry until restart — the timeout turns that into a bounded error.
const UPSTREAM_TIMEOUT_MS = 10_000;

export class BlizzardService {
  // One global token host for every non-CN region. The per-region hosts still
  // exist but tw.battle.net 302-redirects to apac.battle.net, and fetch drops the
  // POST body across the redirect — the token request then fails with 403 and TW
  // breaks. Don't reintroduce `https://${region}.battle.net/oauth/token`.
  private static readonly tokens = new OAuthTokenManager(async () => {
    logger.info("Fetching new Blizzard OAuth token");
    const elapsed = startTimer();

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.blizzardClientId,
      client_secret: config.blizzardClientSecret,
    });

    const res = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      logger.error("Blizzard token request failed", { status: res.status, statusText: res.statusText, durationMs: elapsed() });
      throw new Error(`Failed to fetch Blizzard token: ${res.status} ${res.statusText}`);
    }

    // A cold token adds its own latency to the first fetch behind it, so it is
    // timed separately rather than being blamed on the profile call.
    logger.info("Blizzard OAuth token acquired", { durationMs: elapsed() });
    return res.json() as Promise<{ access_token: string; expires_in: number }>;
  });

  /** Exposed so sibling services (e.g. AchievementsService) can reuse the same token manager. */
  static async getToken(): Promise<string> {
    return this.tokens.getToken();
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false,
    cacheOnly = false
  ): Promise<{ data: BlizzardCharacterProfile; avatarUrl: string | null; fetchedAt: number; characterId: string | null }> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);

    // Defense in depth — the resolver validates region, but guard here too since this is a public static method
    if (!VALID_REGIONS.has(region.toLowerCase())) {
      throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
    }

    if (!bypassCache || cacheOnly) {
      const cached = await getCachedBlizzardProfile({ region, realm: normalizedRealm, name }, cacheOnly);
      if (cached) {
        logger.debug("Blizzard character profile cache hit", { name, realm: normalizedRealm, region });
        return cached; // already includes characterId
      }
    }

    // Crawler traffic is served from cache only (stale allowed above) and must
    // never spend upstream API quota.
    if (cacheOnly) {
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    // Two companions watching the same listing fire identical lookups within
    // milliseconds — share one upstream fetch instead of spending quota twice.
    return dedupeInFlight(
      this.profileInFlight,
      `${region}:${normalizedRealm}:${name.toLowerCase()}`,
      () => this.fetchProfile(args, normalizedRealm)
    );
  }

  private static readonly profileInFlight = new Map<
    string,
    Promise<{ data: BlizzardCharacterProfile; avatarUrl: string | null; fetchedAt: number; characterId: string | null }>
  >();

  private static async fetchProfile(
    args: QueryCharacterArgs,
    normalizedRealm: string
  ): Promise<{ data: BlizzardCharacterProfile; avatarUrl: string | null; fetchedAt: number; characterId: string | null }> {
    const { name, region } = args;
    const elapsed = startTimer();

    try {
      // The token fetch belongs inside the try: an oauth.battle.net outage
      // takes down every lookup at once, which is exactly when the catch below
      // has something better to offer than a raw rejection.
      const token = await this.tokens.getToken();
      const base = `https://${region}.api.blizzard.com/profile/wow/character/${normalizedRealm}/${name.toLowerCase()}`;
      const ns = `namespace=profile-${region}&locale=en_US`;

      logger.info("Blizzard character profile + media request", { name, realm: normalizedRealm, region });

      const [profileRes, mediaRes] = await Promise.allSettled([
        fetch(`${base}?${ns}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }),
        fetch(`${base}/character-media?${ns}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }),
      ]);

      if (profileRes.status === "rejected") throw profileRes.reason;

      const res = profileRes.value;
      if (res.status === 404) {
        logger.warn("Blizzard character not found", { name, realm: normalizedRealm, region, durationMs: elapsed() });
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

      // Timed at the point both the profile and its media have settled - that
      // pair is what the caller actually waits on.
      logger.info("Blizzard character profile fetched", { name, realm: normalizedRealm, region, durationMs: elapsed() });

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

      // Blizzard supplies the identity fields — without it buildCharacter falls
      // back to the raw URL params and the page loses class, spec and item
      // level. The TTL is 24h, so a stale snapshot is almost always still true.
      const stale = await getCachedBlizzardProfile({ region, realm: normalizedRealm, name }, true);
      if (stale) {
        logger.warn("Blizzard fetch failed, serving stale snapshot", {
          name,
          realm: normalizedRealm,
          region,
          durationMs: elapsed(),
          staleBySeconds: Math.floor(Date.now() / 1000) - stale.fetchedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        return stale;
      }

      logger.error("Blizzard character profile fetch failed", {
        name,
        realm: normalizedRealm,
        region,
        durationMs: elapsed(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError("Failed to fetch character profile from Blizzard", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  static async getCharacterEquipment(
    args: QueryCharacterArgs,
    bypassCache = false,
    cacheOnly = false
  ): Promise<{ data: BlizzardCharacterEquipment; fetchedAt: number }> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);

    // Defense in depth — the resolver validates region, but guard here too since this is a public static method
    if (!VALID_REGIONS.has(region.toLowerCase())) {
      throw new GraphQLError("Invalid region", { extensions: { code: "BAD_USER_INPUT" } });
    }

    if (!bypassCache || cacheOnly) {
      const cached = await getCachedEquipment({ region, realm: normalizedRealm, name }, cacheOnly);
      if (cached) {
        logger.debug("Blizzard equipment cache hit", { name, realm: normalizedRealm, region });
        return cached;
      }
    }

    // Crawler traffic is served from cache only (stale allowed above) and must
    // never spend upstream API quota.
    if (cacheOnly) {
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    return dedupeInFlight(
      this.equipmentInFlight,
      `${region}:${normalizedRealm}:${name.toLowerCase()}`,
      () => this.fetchEquipment(args, normalizedRealm)
    );
  }

  private static readonly equipmentInFlight = new Map<
    string,
    Promise<{ data: BlizzardCharacterEquipment; fetchedAt: number }>
  >();

  private static async fetchEquipment(
    args: QueryCharacterArgs,
    normalizedRealm: string
  ): Promise<{ data: BlizzardCharacterEquipment; fetchedAt: number }> {
    const { name, region } = args;
    const elapsed = startTimer();

    try {
      // Inside the try for the same reason as fetchProfile — a token failure
      // must reach the stale fallback, not escape as a raw rejection.
      const token = await this.tokens.getToken();
      const url = `https://${region}.api.blizzard.com/profile/wow/character/${normalizedRealm}/${name.toLowerCase()}/equipment?namespace=profile-${region}&locale=en_US`;

      logger.info("Blizzard equipment request", { name, realm: normalizedRealm, region });

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
      if (res.status === 404) {
        logger.warn("Blizzard equipment not found", { name, realm: normalizedRealm, region, durationMs: elapsed() });
        throw new GraphQLError("Character not found", { extensions: { code: "NOT_FOUND" } });
      }
      if (!res.ok) throw new Error(`Blizzard equipment request failed: ${res.status} ${res.statusText}`);

      const data = await res.json() as BlizzardCharacterEquipment;
      const fetchedAt = Math.floor(Date.now() / 1000);
      const equipmentMs = elapsed();

      const iconsElapsed = startTimer();
      const iconMisses = await this.resolveItemIcons(data, token);

      // The icon fan-out is up to 16 further requests and is reported on its
      // own: a slow gear panel is often the icons, not the equipment call.
      logger.info("Blizzard equipment fetched", {
        name,
        realm: normalizedRealm,
        region,
        durationMs: equipmentMs,
        iconDurationMs: iconsElapsed(),
        iconMisses,
      });

      // persistEquipment catches and logs its own failures — cache writes are non-fatal
      await persistEquipment({ region, realm: normalizedRealm, name }, data, fetchedAt);

      return { data, fetchedAt };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      const stale = await getCachedEquipment({ region, realm: normalizedRealm, name }, true);
      if (stale) {
        logger.warn("Blizzard equipment fetch failed, serving stale snapshot", {
          name,
          realm: normalizedRealm,
          region,
          durationMs: elapsed(),
          staleBySeconds: Math.floor(Date.now() / 1000) - stale.fetchedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        return stale;
      }

      logger.error("Blizzard equipment fetch failed", {
        name,
        realm: normalizedRealm,
        region,
        durationMs: elapsed(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw new GraphQLError("Failed to fetch character equipment from Blizzard", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  /** Sets iconUrl on every equipped item, fetching item media only for cache
   *  misses. Per-item failures are non-fatal. Returns how many items missed the
   *  process cache, i.e. how many upstream requests this fan-out actually made. */
  private static async resolveItemIcons(data: BlizzardCharacterEquipment, token: string): Promise<number> {
    const misses = data.equipped_items.filter((it) => !itemIconCache.has(it.item.id));

    await Promise.allSettled(
      misses.map(async (it) => {
        // media.key.href normally carries the static namespace as a query string
        const href = it.media.key.href;
        const res = await fetch(`${href}${href.includes("?") ? "&" : "?"}locale=en_US`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`Item media request failed: ${res.status}`);
        const media = await res.json() as BlizzardItemMedia;
        const icon = media.assets.find((a) => a.key === "icon")?.value;
        if (icon) itemIconCache.set(it.item.id, icon);
      })
    );

    for (const it of data.equipped_items) {
      it.iconUrl = itemIconCache.get(it.item.id) ?? null;
    }

    return misses.length;
  }
}
