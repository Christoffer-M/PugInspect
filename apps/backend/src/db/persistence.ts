import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import {
  characters,
  characterRioSnapshots,
  characterWclSnapshots,
  characterBlizzardSnapshots,
  characterAchievements,
  characterLinks,
} from "./schema.js";
import type { RaiderIoCharacterApiResponse } from "../schema/services/raiderIo/model/CharacterApiResponse.js";
import type { CharacterProfileQuery } from "../schema/services/warcraftLogs/generated/index.js";
import type { BlizzardCharacterProfile } from "../schema/services/blizzard/model/CharacterProfile.js";
import type { ZoneRanking } from "../schema/services/warcraftLogs/model/ZoneRankings.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DBPersistence" });

const CACHE_TTL_SECONDS = 900; // 15 minutes — RaiderIO and WarcraftLogs
const BLIZZARD_CACHE_TTL_SECONDS = 86_400; // 24 hours — Blizzard data changes infrequently
const ACHIEVEMENT_CACHE_TTL_SECONDS = 604_800; // 7 days — achievements don't un-complete

type CharacterKey = {
  region: string;
  realm: string;
  name: string;
};

export type WclQueryKey = {
  /** WarcraftLogs zone ID; use 0 to represent "not specified". */
  zoneId: number;
  /** Difficulty string ("Normal"/"Heroic"/"Mythic"); use "" for unspecified. */
  difficulty: string;
  /** Metric ("dps"/"hps"); use "" for unspecified. */
  metric: string;
  /** Role ("Any"/"DPS"/"Healer"/"Tank"); use "" for unspecified. */
  role: string;
  byBracket: boolean;
};

type DB = ReturnType<typeof getDb>;

async function upsertCharacter(
  db: DB,
  key: CharacterKey,
  extra?: {
    class?: string | null;
    specialization?: string | null;
    race?: string | null;
    thumbnailUrl?: string | null;
    itemLevel?: number | null;
  }
): Promise<string> {
  const result = await db
    .insert(characters)
    .values({
      region: key.region,
      realm: key.realm,
      name: key.name,
      class: extra?.class ?? null,
      specialization: extra?.specialization ?? null,
      race: extra?.race ?? null,
      thumbnailUrl: extra?.thumbnailUrl ?? null,
      itemLevel: extra?.itemLevel ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [characters.region, characters.realm, characters.name],
      set: {
        ...(extra?.class != null && { class: extra.class }),
        ...(extra?.specialization != null && { specialization: extra.specialization }),
        ...(extra?.race != null && { race: extra.race }),
        ...(extra?.thumbnailUrl != null && { thumbnailUrl: extra.thumbnailUrl }),
        ...(extra?.itemLevel != null && { itemLevel: extra.itemLevel }),
        updatedAt: new Date(),
      },
    })
    .returning({ id: characters.id });

  return result[0]!.id;
}

export async function getCachedRioProfile(
  key: CharacterKey
): Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterRioSnapshots.rawData,
        fetchedAt: characterRioSnapshots.fetchedAt,
      })
      .from(characterRioSnapshots)
      .innerJoin(characters, eq(characterRioSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name),
          gt(characterRioSnapshots.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return {
      data: rows[0].rawData,
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
    };
  } catch (err) {
    logger.error("DB cache read failed (rio)", { key, error: String(err) });
    return null;
  }
}

export async function persistRioProfile(
  key: CharacterKey,
  data: RaiderIoCharacterApiResponse,
  fetchedAt: number
): Promise<void> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key, {
      class: data.class,
      specialization: data.active_spec_name,
      race: data.race,
      thumbnailUrl: data.thumbnail_url,
      itemLevel: data.gear?.item_level_equipped ?? null,
    });

    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + CACHE_TTL_SECONDS) * 1000);
    const score = data.mythic_plus_scores_by_season?.[0]?.segments?.all?.score ?? null;

    await db
      .insert(characterRioSnapshots)
      .values({
        characterId,
        fetchedAt: fetchedAtDate,
        expiresAt: expiresAtDate,
        rawData: data,
        mythicPlusScore: score,
      })
      .onConflictDoUpdate({
        target: characterRioSnapshots.characterId,
        set: {
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
          rawData: data,
          mythicPlusScore: score,
        },
      });
  } catch (err) {
    logger.error("DB cache write failed (rio)", { key, error: String(err) });
  }
}

export async function getCachedWclProfile(
  key: CharacterKey,
  query: WclQueryKey
): Promise<{ data: CharacterProfileQuery["characterData"]; fetchedAt: number } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterWclSnapshots.rawData,
        fetchedAt: characterWclSnapshots.fetchedAt,
      })
      .from(characterWclSnapshots)
      .innerJoin(characters, eq(characterWclSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name),
          eq(characterWclSnapshots.zoneId, query.zoneId),
          eq(characterWclSnapshots.difficulty, query.difficulty),
          eq(characterWclSnapshots.metric, query.metric),
          eq(characterWclSnapshots.role, query.role),
          eq(characterWclSnapshots.byBracket, query.byBracket),
          gt(characterWclSnapshots.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return {
      data: rows[0].rawData as CharacterProfileQuery["characterData"],
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
    };
  } catch (err) {
    logger.error("DB cache read failed (wcl)", { key, query, error: String(err) });
    return null;
  }
}

export async function persistWclProfile(
  key: CharacterKey,
  query: WclQueryKey,
  characterData: CharacterProfileQuery["characterData"],
  fetchedAt: number
): Promise<void> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key);

    const zoneRankings = characterData?.character?.zoneRankings as ZoneRanking | undefined;
    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + CACHE_TTL_SECONDS) * 1000);

    await db
      .insert(characterWclSnapshots)
      .values({
        characterId,
        zoneId: query.zoneId,
        difficulty: query.difficulty,
        metric: query.metric,
        role: query.role,
        byBracket: query.byBracket,
        bestPerformanceAvg: zoneRankings?.bestPerformanceAverage ?? null,
        medianPerformanceAvg: zoneRankings?.medianPerformanceAverage ?? null,
        fetchedAt: fetchedAtDate,
        expiresAt: expiresAtDate,
        rawData: characterData as CharacterProfileQuery["characterData"],
      })
      .onConflictDoUpdate({
        target: [
          characterWclSnapshots.characterId,
          characterWclSnapshots.zoneId,
          characterWclSnapshots.difficulty,
          characterWclSnapshots.metric,
          characterWclSnapshots.role,
          characterWclSnapshots.byBracket,
        ],
        set: {
          bestPerformanceAvg: zoneRankings?.bestPerformanceAverage ?? null,
          medianPerformanceAvg: zoneRankings?.medianPerformanceAverage ?? null,
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
          rawData: characterData as CharacterProfileQuery["characterData"],
        },
      })
  } catch (err) {
    logger.error("DB cache write failed (wcl)", { key, query, error: String(err) });
  }
}

export async function getCachedBlizzardProfile(
  key: CharacterKey
): Promise<{ data: BlizzardCharacterProfile; avatarUrl: string | null; fetchedAt: number; characterId: string } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterBlizzardSnapshots.rawData,
        fetchedAt: characterBlizzardSnapshots.fetchedAt,
        avatarUrl: characters.thumbnailUrl,
        characterId: characters.id,
      })
      .from(characterBlizzardSnapshots)
      .innerJoin(characters, eq(characterBlizzardSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name),
          gt(characterBlizzardSnapshots.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return {
      data: rows[0].rawData,
      avatarUrl: rows[0].avatarUrl,
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
      characterId: rows[0].characterId,
    };
  } catch (err) {
    logger.error("DB cache read failed (blizzard)", { key, error: String(err) });
    return null;
  }
}

export async function persistBlizzardProfile(
  key: CharacterKey,
  data: BlizzardCharacterProfile,
  fetchedAt: number,
  avatarUrl: string | null = null
): Promise<string | null> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key, {
      class: data.character_class.name,
      specialization: data.active_spec.name,
      race: data.race.name,
      thumbnailUrl: avatarUrl,
      itemLevel: data.equipped_item_level,
    });

    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + BLIZZARD_CACHE_TTL_SECONDS) * 1000);

    await db
      .insert(characterBlizzardSnapshots)
      .values({
        characterId,
        fetchedAt: fetchedAtDate,
        expiresAt: expiresAtDate,
        rawData: data,
        equippedItemLevel: data.equipped_item_level,
      })
      .onConflictDoUpdate({
        target: characterBlizzardSnapshots.characterId,
        set: {
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
          rawData: data,
          equippedItemLevel: data.equipped_item_level,
        },
      });

    return characterId;
  } catch (err) {
    logger.error("DB cache write failed (blizzard)", { key, error: String(err) });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Achievement persistence
// ---------------------------------------------------------------------------

export type AchievementInsertRow = {
  achievementId: number;
  achievementName: string;
  completedTimestamp: number | null;
};

/**
 * Returns cached achievement rows if ALL requested IDs are present and non-expired.
 * Returns null if any ID is missing or stale — caller should re-fetch from Blizzard.
 */
export async function getCachedAchievements(
  characterId: string,
  ids: number[]
): Promise<AchievementInsertRow[] | null> {
  try {
    const rows = await getDb()
      .select({
        achievementId: characterAchievements.achievementId,
        achievementName: characterAchievements.achievementName,
        completedTimestamp: characterAchievements.completedTimestamp,
      })
      .from(characterAchievements)
      .where(
        and(
          eq(characterAchievements.characterId, characterId),
          inArray(characterAchievements.achievementId, ids),
          gt(characterAchievements.expiresAt, new Date())
        )
      );

    if (rows.length !== ids.length) return null;

    return rows.map((r) => ({
      achievementId: r.achievementId,
      achievementName: r.achievementName,
      completedTimestamp: r.completedTimestamp ?? null,
    }));
  } catch (err) {
    logger.error("DB cache read failed (achievements)", { characterId, error: String(err) });
    return null;
  }
}

/** Upserts individual achievement rows with a 7-day TTL. */
export async function persistAchievements(
  characterId: string,
  rows: AchievementInsertRow[],
  fetchedAt: number
): Promise<void> {
  if (!rows.length) return;
  try {
    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + ACHIEVEMENT_CACHE_TTL_SECONDS) * 1000);

    await getDb()
      .insert(characterAchievements)
      .values(
        rows.map((r) => ({
          characterId,
          achievementId: r.achievementId,
          achievementName: r.achievementName,
          completedTimestamp: r.completedTimestamp,
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
        }))
      )
      .onConflictDoUpdate({
        target: [characterAchievements.characterId, characterAchievements.achievementId],
        set: {
          achievementName: sql`excluded.achievement_name`,
          completedTimestamp: sql`excluded.completed_timestamp`,
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
        },
      });
  } catch (err) {
    logger.error("DB cache write failed (achievements)", { characterId, error: String(err) });
  }
}

/**
 * Finds other characters that share the same (achievementId, completedTimestamp) pairs.
 * Only matches on non-null timestamps — "not completed" can't prove shared account.
 * Returns character IDs (excluding the current character).
 */
export async function findCharactersByAchievementTimestamps(
  excludeCharacterId: string,
  matches: { achievementId: number; completedTimestamp: number }[]
): Promise<string[]> {
  if (!matches.length) return [];
  try {
    // Build OR conditions for each (achievementId, completedTimestamp) pair
    const conditions = matches.map((m) =>
      and(
        eq(characterAchievements.achievementId, m.achievementId),
        eq(characterAchievements.completedTimestamp, m.completedTimestamp)
      )
    );

    const rows = await getDb()
      .selectDistinct({ characterId: characterAchievements.characterId })
      .from(characterAchievements)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          or(...conditions)!,
          sql`${characterAchievements.characterId} != ${excludeCharacterId}::uuid`
        )
      );

    return rows.map((r) => r.characterId);
  } catch (err) {
    logger.error("DB query failed (findCharactersByAchievementTimestamps)", { error: String(err) });
    return [];
  }
}

/** Inserts a canonical (A < B) character link, ignoring duplicates. */
export async function insertCharacterLink(idA: string, idB: string): Promise<void> {
  const [canonicalA, canonicalB] = idA < idB ? [idA, idB] : [idB, idA];
  try {
    await getDb()
      .insert(characterLinks)
      .values({ characterIdA: canonicalA, characterIdB: canonicalB })
      .onConflictDoNothing();
  } catch (err) {
    logger.error("DB write failed (insertCharacterLink)", { idA, idB, error: String(err) });
  }
}

/** Returns all characters linked to the given characterId. */
export async function getLinkedCharacters(
  characterId: string
): Promise<{ name: string; realm: string; region: string; class: string | null }[]> {
  try {
    const db = getDb();

    // The character may appear as either A or B in the links table
    const linked = await db
      .select({
        linkedId: sql<string>`
          CASE
            WHEN ${characterLinks.characterIdA} = ${characterId}::uuid THEN ${characterLinks.characterIdB}
            ELSE ${characterLinks.characterIdA}
          END
        `,
      })
      .from(characterLinks)
      .where(
        or(
          eq(characterLinks.characterIdA, characterId),
          eq(characterLinks.characterIdB, characterId)
        )
      );

    if (!linked.length) return [];

    const linkedIds = linked.map((r) => r.linkedId);

    const chars = await db
      .select({
        name: characters.name,
        realm: characters.realm,
        region: characters.region,
        class: characters.class,
      })
      .from(characters)
      .where(inArray(characters.id, linkedIds));

    return chars;
  } catch (err) {
    logger.error("DB query failed (getLinkedCharacters)", { characterId, error: String(err) });
    return [];
  }
}
