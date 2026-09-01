import { createLogger } from "../../utils/logger.js";
import { normalizeRealm } from "../../utils/helpers.js";
import { VALID_REGIONS } from "../../utils/regions.js";
import { BlizzardService } from "./blizzard.services.js";
import type { BlizzardAchievementsResponse } from "./model/CharacterProfile.js";
import {
  getCachedAchievements,
  persistAchievements,
  findCharactersByAchievementTimestamps,
  insertCharacterLink,
  type AchievementInsertRow,
} from "../../../db/persistence.js";

const logger = createLogger({ service: "AchievementsService" });

/**
 * Blizzard achievement IDs used for alt detection.
 * Characters that completed the same achievement at the identical millisecond
 * timestamp share a Battle.net account.
 */
const ALT_DETECTION_ACHIEVEMENT_IDS: number[] = [2142];

export class AchievementsService {
  /**
   * Background enrichment — call fire-and-forget after a character is upserted.
   * 1. Checks cache; skips if all configured achievement IDs are fresh.
   * 2. Fetches from Blizzard, stores filtered rows.
   * 3. Finds other characters with matching timestamps → inserts character links.
   */
  static async enrichAndLinkAlts(
    characterId: string,
    key: { name: string; realm: string; region: string }
  ): Promise<void> {
    const ids = ALT_DETECTION_ACHIEVEMENT_IDS;
    if (!ids.length) return; // feature disabled (no IDs configured yet)

    const { name, realm, region } = key;
    const normalizedRealm = normalizeRealm(realm);
    const normalizedName = name.toLowerCase();

    // Skip if all IDs are already cached and fresh
    const cached = await getCachedAchievements(characterId, ids);
    if (cached) {
      logger.debug("Achievement cache hit — skipping enrichment", { name: normalizedName, realm: normalizedRealm, region });
      await this.linkAlts(characterId, cached);
      return;
    }

    logger.info("Fetching achievements for alt detection", { name: normalizedName, realm: normalizedRealm, region, ids });

    const rows = await this.fetchAndMap(normalizedName, normalizedRealm, region, ids);
    if (!rows.length) return;

    const fetchedAt = Math.floor(Date.now() / 1000);
    await persistAchievements(characterId, rows, fetchedAt);

    await this.linkAlts(characterId, rows);
  }

  private static async fetchAndMap(
    name: string,
    realm: string,
    region: string,
    ids: number[]
  ): Promise<AchievementInsertRow[]> {
    if (!VALID_REGIONS.has(region.toLowerCase())) return [];

    try {
      const token = await BlizzardService.getToken();
      const url = `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${name}/achievements?namespace=profile-${region}&locale=en_US`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (res.status === 404) {
        logger.warn("Achievements endpoint returned 404", { name, realm, region });
        return [];
      }
      if (!res.ok) {
        logger.warn("Achievements endpoint returned error", { name, realm, region, status: res.status });
        return [];
      }

      const data = await res.json() as BlizzardAchievementsResponse;
      const idSet = new Set(ids);

      return data.achievements
        .filter((a) => idSet.has(a.id))
        .map((a) => ({
          achievementId: a.id,
          achievementName: a.achievement.name,
          completedTimestamp: a.completed_timestamp ?? null,
        }));
    } catch (err) {
      logger.error("Failed to fetch achievements from Blizzard", { name, realm, region, error: String(err) });
      return [];
    }
  }

  private static async linkAlts(
    characterId: string,
    rows: AchievementInsertRow[]
  ): Promise<void> {
    const completed = rows
      .filter((r): r is AchievementInsertRow & { completedTimestamp: number } =>
        r.completedTimestamp !== null
      )
      .map((r) => ({ achievementId: r.achievementId, completedTimestamp: r.completedTimestamp }));

    if (!completed.length) return;

    const altIds = await findCharactersByAchievementTimestamps(characterId, completed);
    if (!altIds.length) return;

    logger.info("Linking potential alts", { characterId, altCount: altIds.length });

    await Promise.all(altIds.map((altId) => insertCharacterLink(characterId, altId)));
  }
}
