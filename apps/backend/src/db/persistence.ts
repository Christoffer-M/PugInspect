import { and, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import {
  characters,
  characterRioSnapshots,
  characterWclSnapshots,
  characterBlizzardSnapshots,
  characterEquipmentSnapshots,
  characterAchievements,
  characterLinks,
} from "./schema.js";
import type { RaiderIoCharacterApiResponse, RaidProgression } from "../schema/services/raiderIo/model/CharacterApiResponse.js";
import type { CharacterProfileQuery } from "../schema/services/warcraftLogs/generated/index.js";
import type { BlizzardCharacterProfile } from "../schema/services/blizzard/model/CharacterProfile.js";
import type { BlizzardCharacterEquipment } from "../schema/services/blizzard/model/CharacterEquipment.js";
import type { ZoneRanking } from "../schema/services/warcraftLogs/model/ZoneRankings.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DBPersistence" });

const CACHE_TTL_SECONDS = 900; // 15 minutes — RaiderIO and WarcraftLogs
const BLIZZARD_CACHE_TTL_SECONDS = 86_400; // 24 hours — Blizzard data changes infrequently
const EQUIPMENT_CACHE_TTL_SECONDS = 3_600; // 1 hour — gear changes per loot drop; bypassCache covers "I just upgraded"
const ACHIEVEMENT_CACHE_TTL_SECONDS = 604_800; // 7 days — achievements don't un-complete

export type CharacterKey = {
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
  /** WarcraftLogs partition ID; use 0 to represent "not specified". */
  partition: number;
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

/** allowStale serves expired snapshots too — for crawler traffic, which must never trigger upstream fetches. */
export async function getCachedRioProfile(
  key: CharacterKey,
  allowStale = false
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
          ...(allowStale ? [] : [gt(characterRioSnapshots.expiresAt, new Date())])
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
    const characterId = await upsertCharacter(db, key);

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

export type CharacterMetaSnapshot = {
  name: string;
  realm: string;
  class: string | null;
  specialization: string | null;
  race: string | null;
  itemLevel: number | null;
  mythicPlusScore: number | null;
};

/**
 * Lightweight character lookup for SEO meta tags. Deliberately ignores
 * expiresAt — stale data is fine for a meta description, and bot crawls
 * must never trigger upstream API fetches.
 */
export async function getCharacterMetaSnapshot(
  key: CharacterKey
): Promise<CharacterMetaSnapshot | null> {
  try {
    const rows = await getDb()
      .select({
        name: characters.name,
        realm: characters.realm,
        class: characters.class,
        specialization: characters.specialization,
        race: characters.race,
        itemLevel: characters.itemLevel,
        mythicPlusScore: characterRioSnapshots.mythicPlusScore,
      })
      .from(characters)
      .leftJoin(characterRioSnapshots, eq(characterRioSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  } catch (err) {
    logger.error("DB read failed (meta snapshot)", { key, error: String(err) });
    return null;
  }
}

export type CharacterCardSnapshot = {
  name: string;
  realm: string;
  region: string;
  class: string | null;
  specialization: string | null;
  race: string | null;
  thumbnailUrl: string | null;
  itemLevel: number | null;
  mythicPlusScore: number | null;
  mythicPlusColor: string | null;
  topKeyLevel: number | null;
  raidProgression: Record<string, RaidProgression> | null;
};

/**
 * Everything needed to render the Discord og:image card. Like
 * getCharacterMetaSnapshot, deliberately ignores expiresAt — stale data is
 * fine for a card render, and card requests must never trigger upstream fetches.
 */
export async function getCharacterCardSnapshot(
  key: CharacterKey
): Promise<CharacterCardSnapshot | null> {
  try {
    const rows = await getDb()
      .select({
        name: characters.name,
        realm: characters.realm,
        region: characters.region,
        class: characters.class,
        specialization: characters.specialization,
        race: characters.race,
        thumbnailUrl: characters.thumbnailUrl,
        itemLevel: characters.itemLevel,
        mythicPlusScore: characterRioSnapshots.mythicPlusScore,
        mythicPlusColor: sql<
          string | null
        >`${characterRioSnapshots.rawData}->'mythic_plus_scores_by_season'->0->'segments'->'all'->>'color'`,
        topKeyLevel: sql<
          number | null
        >`(${characterRioSnapshots.rawData}->'mythic_plus_best_runs'->0->>'mythic_level')::int`,
        raidProgression: sql<
          Record<string, RaidProgression> | null
        >`${characterRioSnapshots.rawData}->'raid_progression'`,
      })
      .from(characters)
      .leftJoin(characterRioSnapshots, eq(characterRioSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  } catch (err) {
    logger.error("DB read failed (card snapshot)", { key, error: String(err) });
    return null;
  }
}

/** allowStale serves expired snapshots too — for crawler traffic, which must never trigger upstream fetches. */
export async function getCachedWclProfile(
  key: CharacterKey,
  query: WclQueryKey,
  allowStale = false
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
          eq(characterWclSnapshots.partition, query.partition),
          ...(allowStale ? [] : [gt(characterWclSnapshots.expiresAt, new Date())])
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
        partition: query.partition,
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
          characterWclSnapshots.partition,
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

/** allowStale serves expired snapshots too — for crawler traffic, which must never trigger upstream fetches. */
export async function getCachedBlizzardProfile(
  key: CharacterKey,
  allowStale = false
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
          ...(allowStale ? [] : [gt(characterBlizzardSnapshots.expiresAt, new Date())])
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

/** allowStale serves expired snapshots too — for crawler traffic, which must never trigger upstream fetches. */
export async function getCachedEquipment(
  key: CharacterKey,
  allowStale = false
): Promise<{ data: BlizzardCharacterEquipment; fetchedAt: number } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterEquipmentSnapshots.rawData,
        fetchedAt: characterEquipmentSnapshots.fetchedAt,
      })
      .from(characterEquipmentSnapshots)
      .innerJoin(characters, eq(characterEquipmentSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name),
          ...(allowStale ? [] : [gt(characterEquipmentSnapshots.expiresAt, new Date())])
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return {
      data: rows[0].rawData,
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
    };
  } catch (err) {
    logger.error("DB cache read failed (equipment)", { key, error: String(err) });
    return null;
  }
}

export async function persistEquipment(
  key: CharacterKey,
  data: BlizzardCharacterEquipment,
  fetchedAt: number
): Promise<void> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key);

    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + EQUIPMENT_CACHE_TTL_SECONDS) * 1000);

    await db
      .insert(characterEquipmentSnapshots)
      .values({
        characterId,
        fetchedAt: fetchedAtDate,
        expiresAt: expiresAtDate,
        rawData: data,
      })
      .onConflictDoUpdate({
        target: characterEquipmentSnapshots.characterId,
        set: {
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
          rawData: data,
        },
      });
  } catch (err) {
    logger.error("DB cache write failed (equipment)", { key, error: String(err) });
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
          or(...conditions)!,
          ne(characterAchievements.characterId, excludeCharacterId)
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

/** Returns all characters linked to the given characterId, with cached ilvl and M+ score. */
export async function getLinkedCharacters(
  characterId: string
): Promise<{
  name: string; realm: string; region: string; class: string | null;
  itemLevel: number | null; avatarUrl: string | null;
  mythicPlusScore: number | null; mythicPlusColor: string | null;
  raidProgression: { raid: string; summary: string; expansion_id: number; total_bosses: number; normal_bosses_killed: number; heroic_bosses_killed: number; mythic_bosses_killed: number }[];
}[]> {
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

    const rows = await db
      .select({
        name: characters.name,
        realm: characters.realm,
        region: characters.region,
        class: characters.class,
        itemLevel: characters.itemLevel,
        avatarUrl: characters.thumbnailUrl,
        mythicPlusScore: characterRioSnapshots.mythicPlusScore,
        mythicPlusColor: sql<string | null>`${characterRioSnapshots.rawData}->'mythic_plus_scores_by_season'->0->'segments'->'all'->>'color'`,
        rioRawData: characterRioSnapshots.rawData,
      })
      .from(characters)
      // RIO snapshot may be stale — intentional. Alt card data is best-effort display.
      .leftJoin(characterRioSnapshots, eq(characterRioSnapshots.characterId, characters.id))
      .where(inArray(characters.id, linkedIds));

    return rows.map(({ rioRawData, ...rest }) => ({
      ...rest,
      raidProgression: Object.entries(rioRawData?.raid_progression ?? {}).map(([raid, data]) => ({
        raid,
        summary: data.summary,
        expansion_id: data.expansion_id,
        total_bosses: data.total_bosses,
        normal_bosses_killed: data.normal_bosses_killed,
        heroic_bosses_killed: data.heroic_bosses_killed,
        mythic_bosses_killed: data.mythic_bosses_killed,
      })),
    }));
  } catch (err) {
    logger.error("DB query failed (getLinkedCharacters)", { characterId, error: String(err) });
    return [];
  }
}

export type SitemapCharacter = {
  region: string;
  realm: string;
  name: string;
  updatedAt: Date;
};

/**
 * All characters for the server-generated sitemap, newest-updated first.
 * Values are already normalised to lowercase slugs at insert time, so they can
 * be used directly as URL path segments.
 */
export async function getSitemapCharacters(limit: number): Promise<SitemapCharacter[]> {
  try {
    return await getDb()
      .select({
        region: characters.region,
        realm: characters.realm,
        name: characters.name,
        updatedAt: characters.updatedAt,
      })
      .from(characters)
      .orderBy(desc(characters.updatedAt))
      .limit(limit);
  } catch (err) {
    logger.error("DB query failed (getSitemapCharacters)", { error: String(err) });
    return [];
  }
}
