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
import type { BlizzardCharacterEquipment } from "../schema/services/blizzard/model/CharacterEquipment.js";

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
// character_equipment_snapshots
// One row per character (upsert semantics, refreshed on cache expiry).
// Stores the full Blizzard equipment response, enriched with per-item icon
// URLs so cache hits need no item-media calls.
// ---------------------------------------------------------------------------
export const characterEquipmentSnapshots = pgTable(
  "character_equipment_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rawData: jsonb("raw_data").$type<BlizzardCharacterEquipment>().notNull(),
  },
  (t) => [
    uniqueIndex("equipment_snapshots_character_unique").on(t.characterId),
    index("equipment_snapshots_character_expires_idx").on(t.characterId, t.expiresAt),
  ]
);

export type CharacterEquipmentSnapshot = typeof characterEquipmentSnapshots.$inferSelect;
export type NewCharacterEquipmentSnapshot = typeof characterEquipmentSnapshots.$inferInsert;

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
// search_events
// Append-only log of character lookups. One row per character-info resolution
// (the identity query a page view issues once). Powers the /stats dashboard:
// searches per day, trending characters, recent searches.
// ponytail: no dedup/rollup — raw rows with a date index are fine until volume
// says otherwise; add a daily aggregate table if this ever gets slow.
// ---------------------------------------------------------------------------
export const searchEvents = pgTable(
  "search_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    searchedAt: timestamp("searched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("search_events_searched_at_idx").on(t.searchedAt),
    index("search_events_character_searched_idx").on(t.characterId, t.searchedAt),
  ]
);

export type SearchEvent = typeof searchEvents.$inferSelect;
export type NewSearchEvent = typeof searchEvents.$inferInsert;

// ---------------------------------------------------------------------------
// Relations (used by Drizzle's relational query API)
// ---------------------------------------------------------------------------
export const charactersRelations = relations(characters, ({ many }) => ({
  rioSnapshots: many(characterRioSnapshots),
  wclSnapshots: many(characterWclSnapshots),
  blizzardSnapshots: many(characterBlizzardSnapshots),
  equipmentSnapshots: many(characterEquipmentSnapshots),
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

export const equipmentSnapshotsRelations = relations(characterEquipmentSnapshots, ({ one }) => ({
  character: one(characters, {
    fields: [characterEquipmentSnapshots.characterId],
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

/**
 * Aggregated Mythic+ throughput per spec, rebuilt wholesale by the crawler.
 *
 * Rows come in two flavours, distinguished by `encounterId`:
 *   - `0`  — pooled across every dungeon, composition-normalized (the main table)
 *   - `>0` — a single dungeon, raw values (the expanded per-spec detail)
 *
 * `keyFloor` is the scope: "keystone level N and above". Each scope is stored
 * precomputed because percentiles cannot be re-derived from other percentiles.
 */
export const mplusSpecStats = pgTable(
  "mplus_spec_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: integer("zone_id").notNull(),
    keyFloor: integer("key_floor").notNull(),
    // 0 = pooled across all dungeons (WarcraftLogs encounter IDs start at 1)
    encounterId: integer("encounter_id").default(0).notNull(),
    classSlug: varchar("class_slug", { length: 24 }).notNull(),
    specSlug: varchar("spec_slug", { length: 24 }).notNull(),
    role: varchar("role", { length: 8 }).notNull(),
    metric: varchar("metric", { length: 8 }).notNull(),
    // "" = all hero talent trees pooled. Empty string rather than NULL so the
    // unique index below actually constrains those rows (Postgres treats NULLs
    // as distinct).
    heroTalent: varchar("hero_talent", { length: 32 }).default("").notNull(),
    parses: integer("parses").notNull(),
    median: real("median").notNull(),
    p95: real("p95").notNull(),
    max: real("max").notNull(),
    medianKey: integer("median_key").notNull(),
    // Nullable: rows written before this column existed fall back to medianKey.
    maxKey: integer("max_key"),
    // WCL report of the best parse. Anonymous report codes carry an "a:" prefix.
    maxReportCode: varchar("max_report_code", { length: 32 }),
    maxFightId: integer("max_fight_id"),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("mplus_spec_stats_unique").on(
      t.zoneId,
      t.keyFloor,
      t.encounterId,
      t.classSlug,
      t.specSlug,
      t.metric,
      t.heroTalent
    ),
    index("mplus_spec_stats_lookup_idx").on(t.zoneId, t.keyFloor, t.encounterId),
  ]
);

export type MplusSpecStat = typeof mplusSpecStats.$inferSelect;
export type NewMplusSpecStat = typeof mplusSpecStats.$inferInsert;

/** One row per crawled zone: provenance for the page's "how was this made" strip. */
export const mplusStatsMeta = pgTable("mplus_stats_meta", {
  zoneId: integer("zone_id").primaryKey(),
  /** Keystone levels that came back as a complete census, ascending. */
  keyLevels: jsonb("key_levels").$type<number[]>().notNull(),
  totalParses: integer("total_parses").notNull(),
  /** The crawled dungeons, so the UI can label per-dungeon rows. */
  dungeons: jsonb("dungeons").$type<{ id: number; name: string }[]>().notNull(),
  requests: integer("requests").notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MplusStatsMeta = typeof mplusStatsMeta.$inferSelect;

// ---------------------------------------------------------------------------
// rosters
// A shared "Roster Check" import: the character list behind a short link
// (/roster/{region}/{slug}). The creator gets edit_secret back exactly once
// (stored in their browser's localStorage) and can update the list in place;
// anyone without it forks the roster into a new slug instead. The secret is
// never exposed through Query.roster.
// ---------------------------------------------------------------------------
export const rosters = pgTable("rosters", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 16 }).notNull().unique(),
  region: varchar("region", { length: 2 }).notNull(),
  characters: jsonb("characters").$type<{ name: string; realm: string }[]>().notNull(),
  // Nullable: rows created before ownership existed stay fork-only forever.
  editSecret: varchar("edit_secret", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type RosterRow = typeof rosters.$inferSelect;

// ---------------------------------------------------------------------------
// companion_installs / companion_beats
// Desktop companion telemetry. Umami can't answer "how many installs do I
// have" — its visitor hash is IP + user-agent salted with a daily-rotating
// secret, and two Tauri webviews on Windows look identical — so the companion
// mints its own random install id instead and reports here.
//
// Two tables because they age differently: installs is one small row per
// install and is never pruned (install base, MAU, long-horizon retention),
// beats are one row per half hour and get pruned, so the beat table stays
// bounded while the install history survives.
//
// install_id is a random UUID with nothing derived from the machine or the
// player. It is still a persistent identifier, so it is only sent while the
// companion's "Send anonymous usage statistics" setting is on, and the privacy
// policy names it. No IP is stored — only the country derived from it.
// ---------------------------------------------------------------------------
export const companionInstalls = pgTable(
  "companion_installs",
  {
    installId: uuid("install_id").primaryKey(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow().notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
    /** Latest values win, so this table alone answers "who is on what today". */
    version: varchar("version", { length: 16 }).notNull(),
    /** WoW region of the last listing seen, not the player's geography. */
    region: varchar("region", { length: 8 }),
    country: varchar("country", { length: 2 }),
    /** Whether this install has ever decoded a frame — the activation flag. */
    activatedAt: timestamp("activated_at", { withTimezone: true }),
  },
  (t) => [index("companion_installs_last_seen_idx").on(t.lastSeen)]
);

export const companionBeats = pgTable(
  "companion_beats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installId: uuid("install_id").notNull(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
    version: varchar("version", { length: 16 }).notNull(),
    /** Capture link state at beat time: ok | no_window | lost | incompatible |
     *  addon_outdated | app_outdated. The activation funnel lives in this column. */
    link: varchar("link", { length: 16 }).notNull(),
    /** "" when nothing is listed, else "raid:N" | "raid:H" | "raid:M" | "keys". */
    listing: varchar("listing", { length: 8 }).notNull(),
    region: varchar("region", { length: 8 }),
    /** Applicants on the strip, and the in-game total, which can be higher
     *  (the strip caps at 20) — the gap is how often that cap bites. */
    applicants: integer("applicants").notNull(),
    total: integer("total").notNull(),
    /** Counters since the previous beat, not lifetime totals. */
    lookups: integer("lookups").notNull(),
    lookupErrors: integer("lookup_errors").notNull(),
    notFound: integer("not_found").notNull(),
    /** Settings snapshot: which features are actually load-bearing. */
    settings: jsonb("settings").$type<Record<string, boolean | string>>().notNull(),
  },
  (t) => [
    index("companion_beats_at_idx").on(t.at),
    index("companion_beats_install_at_idx").on(t.installId, t.at),
  ]
);

export type CompanionInstall = typeof companionInstalls.$inferSelect;
export type CompanionBeat = typeof companionBeats.$inferSelect;
