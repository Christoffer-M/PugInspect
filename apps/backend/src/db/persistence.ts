import { and, desc, eq, gt, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { getDb } from "./index.js";
import { upsertDirectory } from "./characterDirectory.js";
import { isKnownRealm } from "../schema/utils/helpers.js";
import {
  characters,
  characterRioSnapshots,
  characterProgressionSnapshots,
  characterWclSnapshots,
  characterBlizzardSnapshots,
  characterEquipmentSnapshots,
  characterAchievements,
  characterLinks,
  rosters,
} from "./schema.js";
import type { RaiderIoCharacterApiResponse } from "../schema/services/raiderIo/model/CharacterApiResponse.js";
import type { CharacterProgression } from "../schema/services/blizzard/model/Progression.js";
import type { AltCharacter } from "@repo/graphql-types";
import type { CharacterProfileQuery } from "../schema/services/warcraftLogs/generated/index.js";
import type { BlizzardCharacterProfile } from "../schema/services/blizzard/model/CharacterProfile.js";
import type { BlizzardCharacterEquipment } from "../schema/services/blizzard/model/CharacterEquipment.js";
import type { ZoneRanking } from "../schema/services/warcraftLogs/model/ZoneRankings.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DBPersistence" });

const CACHE_TTL_SECONDS = 900; // 15 minutes — RaiderIO, WarcraftLogs and Blizzard M+
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

    await db
      .insert(characterRioSnapshots)
      .values({
        characterId,
        fetchedAt: fetchedAtDate,
        expiresAt: expiresAtDate,
        rawData: data,
      })
      .onConflictDoUpdate({
        target: characterRioSnapshots.characterId,
        set: {
          fetchedAt: fetchedAtDate,
          expiresAt: expiresAtDate,
          rawData: data,
        },
      });
  } catch (err) {
    logger.error("DB cache write failed (rio)", { key, error: String(err) });
  }
}

/** allowStale serves expired snapshots too — for crawler traffic, which must never trigger upstream fetches. */
export async function getCachedProgression(
  key: CharacterKey,
  allowStale = false
): Promise<{ data: CharacterProgression; fetchedAt: number } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterProgressionSnapshots.rawData,
        fetchedAt: characterProgressionSnapshots.fetchedAt,
      })
      .from(characterProgressionSnapshots)
      .innerJoin(characters, eq(characterProgressionSnapshots.characterId, characters.id))
      .where(
        and(
          eq(characters.region, key.region),
          eq(characters.realm, key.realm),
          eq(characters.name, key.name),
          ...(allowStale ? [] : [gt(characterProgressionSnapshots.expiresAt, new Date())])
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return {
      data: rows[0].rawData,
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
    };
  } catch (err) {
    logger.error("DB cache read failed (progression)", { key, error: String(err) });
    return null;
  }
}

export async function persistProgression(
  key: CharacterKey,
  data: CharacterProgression,
  fetchedAt: number
): Promise<void> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key);

    const values = {
      fetchedAt: new Date(fetchedAt * 1000),
      expiresAt: new Date((fetchedAt + CACHE_TTL_SECONDS) * 1000),
      rawData: data,
    };

    await db
      .insert(characterProgressionSnapshots)
      .values({ characterId, ...values })
      .onConflictDoUpdate({ target: characterProgressionSnapshots.characterId, set: values });
  } catch (err) {
    logger.error("DB cache write failed (progression)", { key, error: String(err) });
  }
}

export type CharacterSeoSnapshot = {
  name: string;
  realm: string;
  region: string;
  class: string | null;
  specialization: string | null;
  race: string | null;
  thumbnailUrl: string | null;
  itemLevel: number | null;
  progression: CharacterProgression | null;
};

/**
 * Everything the crawler-facing renderers need: the og:image card and the
 * meta tags plus text summary injected into bot HTML. Deliberately ignores
 * expiresAt — stale data is fine for either, and neither path may ever
 * trigger an upstream fetch.
 */
export async function getCharacterSeoSnapshot(
  key: CharacterKey
): Promise<CharacterSeoSnapshot | null> {
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
        progression: characterProgressionSnapshots.rawData,
      })
      .from(characters)
      .leftJoin(characterProgressionSnapshots, eq(characterProgressionSnapshots.characterId, characters.id))
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
    logger.error("DB read failed (seo snapshot)", { key, error: String(err) });
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

    // Blizzard just confirmed this character exists, so it belongs in
    // autocomplete. Non-fatal: the profile is already cached.
    await upsertDirectory([{ ...key, specId: data.active_spec.id, lastSeenAt: fetchedAtDate }]).catch((err: unknown) =>
      logger.warn("Character directory write failed", { key, error: String(err) })
    );

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

/** Returns all characters linked to the given characterId, with their cached ilvl and progression. */
export async function getLinkedCharacters(characterId: string): Promise<AltCharacter[]> {
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
        progression: characterProgressionSnapshots.rawData,
      })
      .from(characters)
      // Snapshot may be stale — intentional. Alt card data is best-effort display.
      .leftJoin(characterProgressionSnapshots, eq(characterProgressionSnapshots.characterId, characters.id))
      .where(inArray(characters.id, linkedIds));

    return rows.map(({ progression, ...rest }) => ({
      ...rest,
      mythicPlus: progression?.mythicPlus ?? null,
      raidProgression: progression?.raidProgression ?? null,
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
 *
 * Rows whose realm isn't one Blizzard publishes are dropped rather than listed:
 * they are 404s, and a sitemap full of them is the one place a bad realm costs
 * us something beyond a wasted row. Realms are resolved at the API boundary
 * now, so this only screens rows written before that — and realms too new to
 * be in the table, which is the right call for a sitemap either way.
 */
export async function getSitemapCharacters(limit: number): Promise<SitemapCharacter[]> {
  try {
    const rows = await getDb()
      .select({
        region: characters.region,
        realm: characters.realm,
        name: characters.name,
        updatedAt: characters.updatedAt,
      })
      .from(characters)
      .orderBy(desc(characters.updatedAt))
      .limit(limit);
    return rows.filter((r) => isKnownRealm(r.realm, r.region));
  } catch (err) {
    logger.error("DB query failed (getSitemapCharacters)", { error: String(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Rosters (Roster Check share links)
// ---------------------------------------------------------------------------

function randomSlug(): string {
  // 8 chars of base36 from crypto randomness - ~41 bits, plenty for a table
  // that only grows by explicit user shares.
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");
}

function randomSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/** Postgres unique-violation, the only insert failure a new slug can fix. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505" || /rosters_slug_unique/.test(String(err));
}

/** Insert a roster and return its slug plus the one-time edit secret. Retries on
 *  the (astronomically unlikely) slug collision instead of failing the request;
 *  any other DB error fails fast rather than hammering a struggling database. */
export async function insertRoster(
  region: string,
  chars: { name: string; realm: string }[]
): Promise<{ slug: string; editSecret: string }> {
  const editSecret = randomSecret();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = randomSlug();
    try {
      await getDb().insert(rosters).values({ slug, region, characters: chars, editSecret });
      return { slug, editSecret };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

/** Returns null only when no row matches - a DB failure throws, so the client
 *  can tell "roster doesn't exist" apart from "the lookup failed" (it caches
 *  not-found aggressively). */
export async function getRosterBySlug(
  region: string,
  slug: string
): Promise<{ slug: string; region: string; characters: { name: string; realm: string }[] } | null> {
  const rows = await getDb()
    // editSecret is deliberately not selected - it must never reach Query.roster.
    .select({ slug: rosters.slug, region: rosters.region, characters: rosters.characters })
    .from(rosters)
    .where(and(eq(rosters.region, region), eq(rosters.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

/** Replace a roster's character list in place. Returns the updated roster, or
 *  null when slug+region+secret don't match a row (wrong or missing secret -
 *  indistinguishable from a missing roster on purpose). */
export async function updateRosterCharacters(
  region: string,
  slug: string,
  editSecret: string,
  chars: { name: string; realm: string }[]
): Promise<{ slug: string; region: string; characters: { name: string; realm: string }[] } | null> {
  const rows = await getDb()
    .update(rosters)
    .set({ characters: chars })
    .where(
      and(eq(rosters.region, region), eq(rosters.slug, slug), eq(rosters.editSecret, editSecret))
    )
    .returning({ slug: rosters.slug, region: rosters.region, characters: rosters.characters });
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Retention
//
// Cached upstream data may not be kept indefinitely. Blizzard's terms cap it at
// 30 days; WarcraftLogs answers with `Cache-Control: no-cache, private` and
// their terms forbid holding a copy longer than the header allows, so WCL gets
// the shortest window that still lets a page view hit a warm cache.
//
// Rows go by fetchedAt, NOT expiresAt: the SEO and crawler paths read expired
// rows on purpose (see getCharacterSeoSnapshot), so this only drops characters
// nobody has looked at for the whole window. Anything still being viewed is
// refreshed long before the cutoff.
// ---------------------------------------------------------------------------

/** Blizzard's hard ceiling on retaining cached Data. Nothing here may exceed it. */
export const MAX_RETENTION_DAYS = 30;

export const RETENTION: { label: string; table: PgTable; id: PgColumn; fetchedAt: PgColumn; days: number }[] = [
  { label: "wcl", table: characterWclSnapshots, id: characterWclSnapshots.id, fetchedAt: characterWclSnapshots.fetchedAt, days: 1 },
  { label: "rio", table: characterRioSnapshots, id: characterRioSnapshots.id, fetchedAt: characterRioSnapshots.fetchedAt, days: 30 },
  { label: "progression", table: characterProgressionSnapshots, id: characterProgressionSnapshots.id, fetchedAt: characterProgressionSnapshots.fetchedAt, days: 30 },
  { label: "blizzard", table: characterBlizzardSnapshots, id: characterBlizzardSnapshots.id, fetchedAt: characterBlizzardSnapshots.fetchedAt, days: 30 },
  { label: "equipment", table: characterEquipmentSnapshots, id: characterEquipmentSnapshots.id, fetchedAt: characterEquipmentSnapshots.fetchedAt, days: 30 },
  { label: "achievements", table: characterAchievements, id: characterAchievements.id, fetchedAt: characterAchievements.fetchedAt, days: 30 },
];

/**
 * How many rows one DELETE may take. None of these tables is indexed on
 * fetchedAt alone, so an unbounded delete is a sequential scan holding locks
 * for however long the backlog takes — batching keeps each statement short.
 */
const PRUNE_BATCH = 1_000;

/** Drops cached upstream snapshots past their retention window. Runs daily. */
export async function pruneSnapshots(): Promise<void> {
  for (const { label, table, id, fetchedAt, days } of RETENTION) {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    let total = 0;
    try {
      for (;;) {
        const doomed = getDb()
          .select({ id })
          .from(table)
          .where(lt(fetchedAt, cutoff))
          .limit(PRUNE_BATCH);
        const deleted = await getDb().delete(table).where(inArray(id, doomed));
        total += deleted.rowCount ?? 0;
        if ((deleted.rowCount ?? 0) < PRUNE_BATCH) break;
      }
      logger.info("Pruned expired snapshots", { table: label, days, rows: total });
    } catch (error) {
      // One bad table must not stop the rest — the next daily tick retries.
      logger.error("Prune failed", { table: label, error: String(error), rows: total });
    }
  }
}
