import { and, eq, gt } from "drizzle-orm";
import { getDb } from "./index.js";
import {
  characters,
  characterRioSnapshots,
  characterWclSnapshots,
  characterBlizzardSnapshots,
} from "./schema.js";
import type { RaiderIoCharacterApiResponse } from "../schema/services/raiderIo/model/CharacterApiResponse.js";
import type { CharacterProfileQuery } from "../schema/services/warcraftLogs/generated/index.js";
import type { BlizzardCharacterProfile } from "../schema/services/blizzard/model/CharacterProfile.js";
import type { ZoneRanking } from "../schema/services/warcraftLogs/model/ZoneRankings.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DBPersistence" });

const CACHE_TTL_SECONDS = 900;

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
): Promise<{ data: BlizzardCharacterProfile; fetchedAt: number } | null> {
  try {
    const rows = await getDb()
      .select({
        rawData: characterBlizzardSnapshots.rawData,
        fetchedAt: characterBlizzardSnapshots.fetchedAt,
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
      fetchedAt: Math.floor(rows[0].fetchedAt.getTime() / 1000),
    };
  } catch (err) {
    logger.error("DB cache read failed (blizzard)", { key, error: String(err) });
    return null;
  }
}

export async function persistBlizzardProfile(
  key: CharacterKey,
  data: BlizzardCharacterProfile,
  fetchedAt: number
): Promise<void> {
  try {
    const db = getDb();
    const characterId = await upsertCharacter(db, key, {
      class: data.character_class.name,
      specialization: data.active_spec.name,
      race: data.race.name,
      thumbnailUrl: null, // media endpoint is a separate call; not available in the summary
      itemLevel: data.equipped_item_level,
    });

    const fetchedAtDate = new Date(fetchedAt * 1000);
    const expiresAtDate = new Date((fetchedAt + CACHE_TTL_SECONDS) * 1000);

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
  } catch (err) {
    logger.error("DB cache write failed (blizzard)", { key, error: String(err) });
  }
}
