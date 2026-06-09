import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  real,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { RaiderIoCharacterApiResponse } from "../schema/services/raiderIo/model/CharacterApiResponse.js";
import type { CharacterProfileQuery } from "../schema/services/warcraftLogs/generated/index.js";
import type { BlizzardCharacterProfile } from "../schema/services/blizzard/model/CharacterProfile.js";

// ---------------------------------------------------------------------------
// characters
// Canonical identity record for a WoW character. All other tables FK here.
// Normalised to lowercase (region/realm/name) to ensure uniqueness regardless
// of how the caller capitalises the query.
// ---------------------------------------------------------------------------
export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    region: varchar("region", { length: 2 }).notNull(),
    realm: varchar("realm", { length: 100 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    class: varchar("class", { length: 50 }),
    specialization: varchar("specialization", { length: 50 }),
    race: varchar("race", { length: 50 }),
    thumbnailUrl: text("thumbnail_url"),
    itemLevel: real("item_level"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("characters_region_realm_name_unique").on(t.region, t.realm, t.name),
    // Composite index doubles as the lookup path for the unique check above —
    // PostgreSQL reuses it for both purposes so no extra index is needed.
  ]
);

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

// ---------------------------------------------------------------------------
// character_rio_snapshots
// Append-only snapshot of a Raider.IO API response.  New rows are inserted
// on each cache miss; the resolver queries the row with the latest fetchedAt
// where expiresAt > now().  Old rows are left in place for historical
// analysis and can be pruned by a background job or pg_partman in future.
// ---------------------------------------------------------------------------
export const characterRioSnapshots = pgTable(
  "character_rio_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Full raw API response stored as JSONB so that no API data is discarded.
    // The .$type<T>() annotation gives compile-time safety for consumers.
    rawData: jsonb("raw_data").$type<RaiderIoCharacterApiResponse>().notNull(),
    // Extracted for lightweight analytics queries without JSON path operators.
    mythicPlusScore: real("mythic_plus_score"),
  },
  (t) => [
    uniqueIndex("rio_snapshots_character_unique").on(t.characterId),
    index("rio_snapshots_character_expires_idx").on(t.characterId, t.expiresAt),
  ]
);

export type CharacterRioSnapshot = typeof characterRioSnapshots.$inferSelect;
export type NewCharacterRioSnapshot = typeof characterRioSnapshots.$inferInsert;

// ---------------------------------------------------------------------------
// character_wcl_snapshots
// One row per unique combination of (character, query-params).  Uses upsert
// semantics so the row is refreshed in-place when the cache expires.
//
// Optional query params (zoneId, difficulty, metric, role) are stored as
// NOT NULL with sentinel defaults (0 / "") so that the multi-column unique
// index correctly identifies a single row per combination.
// ---------------------------------------------------------------------------
export const characterWclSnapshots = pgTable(
  "character_wcl_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    // 0 = "not specified" (WarcraftLogs zone IDs start at 1)
    zoneId: integer("zone_id").default(0).notNull(),
    // "" = "not specified"
    difficulty: varchar("difficulty", { length: 10 }).default("").notNull(),
    metric: varchar("metric", { length: 32 }).default("").notNull(),
    role: varchar("role", { length: 10 }).default("").notNull(),
    byBracket: boolean("by_bracket").default(false).notNull(),
    // 0 = "not specified"
    partition: integer("partition").default(0).notNull(),
    // Zone-level aggregates extracted for quick GraphQL resolution
    bestPerformanceAvg: real("best_performance_avg"),
    medianPerformanceAvg: real("median_performance_avg"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Full WarcraftLogs characterData response
    rawData: jsonb("raw_data").$type<CharacterProfileQuery["characterData"]>().notNull(),
  },
  (t) => [
    uniqueIndex("wcl_snapshots_char_query_unique").on(
      t.characterId,
      t.zoneId,
      t.difficulty,
      t.metric,
      t.role,
      t.byBracket,
      t.partition
    ),
    index("wcl_snapshots_character_expires_idx").on(t.characterId, t.expiresAt),
    index("wcl_snapshots_character_fetched_idx").on(t.characterId, t.fetchedAt),
  ]
);

export type CharacterWclSnapshot = typeof characterWclSnapshots.$inferSelect;
export type NewCharacterWclSnapshot = typeof characterWclSnapshots.$inferInsert;

// ---------------------------------------------------------------------------
// character_blizzard_snapshots
// One row per character (upsert semantics, refreshed on cache expiry).
// Stores the full Blizzard character summary response.  Intended to become
// the primary source of truth for character identity, replacing RaiderIO.
// ---------------------------------------------------------------------------
export const characterBlizzardSnapshots = pgTable(
  "character_blizzard_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rawData: jsonb("raw_data").$type<BlizzardCharacterProfile>().notNull(),
    // Extracted for lightweight queries without JSON path operators
    equippedItemLevel: real("equipped_item_level"),
  },
  (t) => [
    uniqueIndex("blizzard_snapshots_character_unique").on(t.characterId),
    index("blizzard_snapshots_character_expires_idx").on(t.characterId, t.expiresAt),
  ]
);

export type CharacterBlizzardSnapshot = typeof characterBlizzardSnapshots.$inferSelect;
export type NewCharacterBlizzardSnapshot = typeof characterBlizzardSnapshots.$inferInsert;

// ---------------------------------------------------------------------------
// character_achievements
// One row per (character × achievementId). Stores filtered achievement
// completion data — never the full raw dump. Used for alt detection by
// cross-referencing completedTimestamp across characters.
// TTL: 7 days (achievements don't un-complete, so long caching is safe).
// ---------------------------------------------------------------------------
export const characterAchievements = pgTable(
  "character_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id").notNull(),
    achievementName: varchar("achievement_name", { length: 200 }).notNull(),
    // ms epoch; null means the achievement has not been completed
    completedTimestamp: bigint("completed_timestamp", { mode: "number" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("char_achievements_char_ach_unique").on(t.characterId, t.achievementId),
    // Fast lookup for alt detection: all chars that completed achievement X at timestamp T
    index("char_achievements_lookup_idx").on(t.achievementId, t.completedTimestamp),
  ]
);

export type CharacterAchievementRow = typeof characterAchievements.$inferSelect;
export type NewCharacterAchievement = typeof characterAchievements.$inferInsert;

// ---------------------------------------------------------------------------
// character_links
// Persistent alt relationships discovered via achievement timestamp matching.
// Deduped by canonical ordering: characterIdA < characterIdB (UUID lex order).
// Once linked, never needs re-running for that pair.
// ---------------------------------------------------------------------------
export const characterLinks = pgTable(
  "character_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterIdA: uuid("character_id_a")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    characterIdB: uuid("character_id_b")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("character_links_pair_unique").on(t.characterIdA, t.characterIdB),
    index("character_links_a_idx").on(t.characterIdA),
    index("character_links_b_idx").on(t.characterIdB),
  ]
);

export type CharacterLink = typeof characterLinks.$inferSelect;
export type NewCharacterLink = typeof characterLinks.$inferInsert;

// ---------------------------------------------------------------------------
// Relations (used by Drizzle's relational query API)
// ---------------------------------------------------------------------------
export const charactersRelations = relations(characters, ({ many }) => ({
  rioSnapshots: many(characterRioSnapshots),
  wclSnapshots: many(characterWclSnapshots),
  blizzardSnapshots: many(characterBlizzardSnapshots),
  achievements: many(characterAchievements),
  linksAsA: many(characterLinks, { relationName: "characterA" }),
  linksAsB: many(characterLinks, { relationName: "characterB" }),
}));

export const rioSnapshotsRelations = relations(characterRioSnapshots, ({ one }) => ({
  character: one(characters, {
    fields: [characterRioSnapshots.characterId],
    references: [characters.id],
  }),
}));

export const wclSnapshotsRelations = relations(characterWclSnapshots, ({ one }) => ({
  character: one(characters, {
    fields: [characterWclSnapshots.characterId],
    references: [characters.id],
  }),
}));

export const blizzardSnapshotsRelations = relations(characterBlizzardSnapshots, ({ one }) => ({
  character: one(characters, {
    fields: [characterBlizzardSnapshots.characterId],
    references: [characters.id],
  }),
}));

export const characterAchievementsRelations = relations(characterAchievements, ({ one }) => ({
  character: one(characters, {
    fields: [characterAchievements.characterId],
    references: [characters.id],
  }),
}));

export const characterLinksRelations = relations(characterLinks, ({ one }) => ({
  characterA: one(characters, {
    fields: [characterLinks.characterIdA],
    references: [characters.id],
    relationName: "characterA",
  }),
  characterB: one(characters, {
    fields: [characterLinks.characterIdB],
    references: [characters.id],
    relationName: "characterB",
  }),
}));
