/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AltCharacter = {
  __typename?: 'AltCharacter';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  class?: Maybe<Scalars['String']['output']>;
  itemLevel?: Maybe<Scalars['Float']['output']>;
  mythicPlus?: Maybe<MythicPlus>;
  name: Scalars['String']['output'];
  raidProgression?: Maybe<Array<RaidProgress>>;
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
};

export type BestRank = {
  __typename?: 'BestRank';
  ilvl?: Maybe<Scalars['Int']['output']>;
};

export type Character = {
  __typename?: 'Character';
  achievementPoints?: Maybe<Scalars['Int']['output']>;
  activeSpec?: Maybe<Scalars['String']['output']>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  averageItemLevel?: Maybe<Scalars['Float']['output']>;
  class?: Maybe<Scalars['String']['output']>;
  equippedItemLevel?: Maybe<Scalars['Float']['output']>;
  faction?: Maybe<Scalars['String']['output']>;
  gear?: Maybe<Gear>;
  gender?: Maybe<Scalars['String']['output']>;
  guild?: Maybe<Guild>;
  level?: Maybe<Scalars['Int']['output']>;
  /** Blizzard. */
  mythicPlus?: Maybe<MythicPlus>;
  mythicPlusLogs?: Maybe<MythicPlusLogs>;
  name: Scalars['String']['output'];
  potentialAlts: Array<AltCharacter>;
  race?: Maybe<Scalars['String']['output']>;
  raidLogs?: Maybe<RaidLogs>;
  /** Blizzard. */
  raidProgression?: Maybe<Array<RaidProgress>>;
  realm: Scalars['String']['output'];
  /**
   * Canonical API slug (der-rat-von-dalaran). Build character URLs from this;
   * clients carry no realm table of their own.
   */
  realmSlug: Scalars['String']['output'];
  /** Raider.IO - Blizzard has no run history. */
  recentMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  region: Scalars['String']['output'];
};


export type CharacterMythicPlusLogsArgs = {
  metric?: InputMaybe<Metric>;
  role?: InputMaybe<RoleType>;
};


export type CharacterRaidLogsArgs = {
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
  metric?: InputMaybe<Metric>;
  role?: InputMaybe<RoleType>;
};

export type ClassCount = {
  __typename?: 'ClassCount';
  class: Scalars['String']['output'];
  count: Scalars['Int']['output'];
};

export type CompanionCap = {
  __typename?: 'CompanionCap';
  beats: Scalars['Int']['output'];
  installs: Scalars['Int']['output'];
  /** Applicants the HUD strip stops at. */
  limit: Scalars['Int']['output'];
  /** Highest in-game total seen while the strip was capped. */
  maxTotal: Scalars['Int']['output'];
};

export type CompanionCohort = {
  __typename?: 'CompanionCohort';
  day1: Scalars['Int']['output'];
  day7: Scalars['Int']['output'];
  daysToWait: Scalars['Int']['output'];
  end: Scalars['String']['output'];
  /** True for the newest bucket, whose members are too young for a day-7 number. */
  pending: Scalars['Boolean']['output'];
  size: Scalars['Int']['output'];
  start: Scalars['String']['output'];
};

export type CompanionCountryCount = {
  __typename?: 'CompanionCountryCount';
  count: Scalars['Int']['output'];
  country: Scalars['String']['output'];
};

export type CompanionDailyCount = {
  __typename?: 'CompanionDailyCount';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type CompanionFunnel = {
  __typename?: 'CompanionFunnel';
  /** Installs that have decoded at least one frame, ever. */
  activated: Scalars['Int']['output'];
  activeThisWeek: Scalars['Int']['output'];
  installs: Scalars['Int']['output'];
  never: Scalars['Int']['output'];
  /** Of the never-activated, how many last reported no_window. */
  neverNoWindow: Scalars['Int']['output'];
};

export type CompanionInstallRow = {
  __typename?: 'CompanionInstallRow';
  activatedAt?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  firstSeen: Scalars['String']['output'];
  /** First four characters of the install UUID — enough to tell rows apart. */
  installId: Scalars['String']['output'];
  lastSeen: Scalars['String']['output'];
  link?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

export type CompanionLinkStat = {
  __typename?: 'CompanionLinkStat';
  beats: Scalars['Int']['output'];
  installs: Scalars['Int']['output'];
  link: Scalars['String']['output'];
};

export type CompanionLookups = {
  __typename?: 'CompanionLookups';
  errors: Scalars['Int']['output'];
  notFound: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type CompanionRegionCount = {
  __typename?: 'CompanionRegionCount';
  count: Scalars['Int']['output'];
  region: Scalars['String']['output'];
};

export type CompanionSessionBucket = {
  __typename?: 'CompanionSessionBucket';
  bucket: Scalars['String']['output'];
  percent: Scalars['Int']['output'];
};

export type CompanionStranded = {
  __typename?: 'CompanionStranded';
  failures: Scalars['Int']['output'];
  from: Scalars['String']['output'];
  installs: Scalars['Int']['output'];
  to: Scalars['String']['output'];
};

export type CompanionTelemetry = {
  __typename?: 'CompanionTelemetry';
  beatsThisWeek: Scalars['Int']['output'];
  cap: CompanionCap;
  cohorts: Array<CompanionCohort>;
  countries: Array<CompanionCountryCount>;
  funnel: CompanionFunnel;
  /** Cumulative install count, one point per day across the window. */
  growth: Array<CompanionDailyCount>;
  installs: Array<CompanionInstallRow>;
  /** Capture link states over the last 7 days, healthy first. */
  links: Array<CompanionLinkStat>;
  lookups: CompanionLookups;
  newThisWindow: Scalars['Int']['output'];
  /** Newest last_seen across all installs, ISO. Null when there are none. */
  newestReport?: Maybe<Scalars['String']['output']>;
  regions: Array<CompanionRegionCount>;
  /** Beats per day over the last 14 days. */
  runtime: Array<CompanionDailyCount>;
  runtimeBeats: Scalars['Int']['output'];
  sessions: Array<CompanionSessionBucket>;
  stranded: Array<CompanionStranded>;
  versions: Array<CompanionVersionCount>;
  /** Length of the beat window every panel below is computed over. */
  windowDays: Scalars['Int']['output'];
};

export type CompanionVersionCount = {
  __typename?: 'CompanionVersionCount';
  count: Scalars['Int']['output'];
  version: Scalars['String']['output'];
};

export type DailySearchCount = {
  __typename?: 'DailySearchCount';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export enum Difficulty {
  Heroic = 'Heroic',
  Lfr = 'LFR',
  Mythic = 'Mythic',
  Normal = 'Normal'
}

export type Encounter = {
  __typename?: 'Encounter';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type Gear = {
  __typename?: 'Gear';
  /** Equipped item level computed from the equipment snapshot — always consistent with items, unlike the profile's equipped_item_level which lags */
  equippedItemLevel: Scalars['Int']['output'];
  items: Array<GearItem>;
  tierSets: Array<TierSetSummary>;
};

export type GearItem = {
  __typename?: 'GearItem';
  /** Item modifier ids — Wowhead tooltip bonus= param */
  bonusIds: Array<Scalars['Int']['output']>;
  /** Permanent enchant display text, null if unenchanted */
  enchant?: Maybe<Scalars['String']['output']>;
  /** Permanent enchant id — Wowhead tooltip ench= param */
  enchantId?: Maybe<Scalars['Int']['output']>;
  iconUrl?: Maybe<Scalars['String']['output']>;
  /** Blizzard item id — e.g. for wowhead.com/item=<id> links */
  itemId: Scalars['Int']['output'];
  itemLevel: Scalars['Int']['output'];
  /** True when the slot is enchantable this season but has no permanent enchant */
  missingEnchant: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** POOR|COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|ARTIFACT|HEIRLOOM */
  quality: Scalars['String']['output'];
  /** Canonical slot token, e.g. HEAD — stable key, defines display order */
  slot: Scalars['String']['output'];
  /** Localized slot name, e.g. Head */
  slotName: Scalars['String']['output'];
  sockets: Array<GearSocket>;
  tierSetId?: Maybe<Scalars['Int']['output']>;
  tierSetName?: Maybe<Scalars['String']['output']>;
};

export type GearSocket = {
  __typename?: 'GearSocket';
  /** Gem display text (e.g. +176 Haste) or gem name; null when empty */
  display?: Maybe<Scalars['String']['output']>;
  filled: Scalars['Boolean']['output'];
  /** Socketed gem's item id, null when the socket is empty */
  itemId?: Maybe<Scalars['Int']['output']>;
};

export type Guild = {
  __typename?: 'Guild';
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
};

export enum Metric {
  Dps = 'dps',
  Hps = 'hps',
  PointsAndDamage = 'points_and_damage',
  PointsAndHealing = 'points_and_healing'
}

export type Mutation = {
  __typename?: 'Mutation';
  createRoster: Roster;
  /**
   * Replace a roster's character list. Requires the editSecret handed out by
   * createRoster; without it, fork the roster via createRoster instead.
   */
  updateRoster: Roster;
};


export type MutationCreateRosterArgs = {
  characters: Array<RosterCharacterInput>;
  region: Scalars['String']['input'];
};


export type MutationUpdateRosterArgs = {
  characters: Array<RosterCharacterInput>;
  editSecret: Scalars['String']['input'];
  region: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};

/** Mythic+ rating and best runs from Blizzard. */
export type MythicPlus = {
  __typename?: 'MythicPlus';
  currentSeason?: Maybe<MythicPlusSeason>;
  /** Null for a character with no keys that season. */
  previousSeason?: Maybe<MythicPlusSeason>;
};

export type MythicPlusDungeon = {
  __typename?: 'MythicPlusDungeon';
  encounterId: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type MythicPlusLogs = ZoneLogs & {
  __typename?: 'MythicPlusLogs';
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  dungeonRankings?: Maybe<Array<MythicPlusRanking>>;
  medianPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  metric?: Maybe<Metric>;
};

export type MythicPlusRanking = {
  __typename?: 'MythicPlusRanking';
  bestLevel?: Maybe<Scalars['Int']['output']>;
  bestScore?: Maybe<Scalars['Float']['output']>;
  bestThroughput?: Maybe<Scalars['Float']['output']>;
  dungeon?: Maybe<Encounter>;
  lowParses?: Maybe<Scalars['Boolean']['output']>;
  medianPercent?: Maybe<Scalars['Float']['output']>;
  medianThroughputPercent?: Maybe<Scalars['Float']['output']>;
  rankPercent?: Maybe<Scalars['Float']['output']>;
  spec?: Maybe<Scalars['String']['output']>;
  throughputPercent?: Maybe<Scalars['Float']['output']>;
  totalRuns?: Maybe<Scalars['Int']['output']>;
};

export type MythicPlusRun = {
  __typename?: 'MythicPlusRun';
  completedAt: Scalars['String']['output'];
  dungeon: Scalars['String']['output'];
  /** Keystone dungeon (challenge mode) id: the key into the client's dungeon config for icons. */
  dungeonId: Scalars['Int']['output'];
  keyLevel: Scalars['Int']['output'];
  /** The character's spec in the run, e.g. Beast Mastery. */
  spec?: Maybe<Scalars['String']['output']>;
  /** 0 when over time, else the keystone upgrade count (1-3). */
  upgrades: Scalars['Int']['output'];
  /** Run page on Raider.IO; null for Blizzard runs, which have none. */
  url?: Maybe<Scalars['String']['output']>;
};

export type MythicPlusSeason = {
  __typename?: 'MythicPlusSeason';
  /** Best run per dungeon, highest rated first. */
  bestRuns: Array<MythicPlusRun>;
  /** In-game rating colour (#rrggbb). Null once the season has ended: Blizzard drops it. */
  color?: Maybe<Scalars['String']['output']>;
  rating: Scalars['Float']['output'];
  /** Season slug from the season config, e.g. season-mn-2. Null if the config predates it. */
  season?: Maybe<Scalars['String']['output']>;
};

/**
 * Aggregated Mythic+ throughput for every spec, refreshed hourly from
 * WarcraftLogs. Each spec's fastest runs are sampled separately, at the same
 * depth, so every spec appears regardless of popularity or which keystone
 * levels it reaches; values are real DPS/HPS, corrected so a spec cannot rank
 * higher purely by being logged in the higher-damage dungeons or at other keys.
 */
export type MythicPlusSpecStats = {
  __typename?: 'MythicPlusSpecStats';
  dungeons: Array<MythicPlusDungeon>;
  /** Lowest keystone level in the sample. */
  keyFloor: Scalars['Int']['output'];
  /** Every keystone level present in the sample, ascending. */
  keyLevels: Array<Scalars['Int']['output']>;
  /** Lowest keystone level in the sample. */
  minKeyLevel: Scalars['Int']['output'];
  /** Below this parse count a spec is shown but not ranked. */
  minParsesToRank: Scalars['Int']['output'];
  /** Same, for a single hero talent tree — a much smaller sample. */
  minParsesToRankHero: Scalars['Int']['output'];
  refreshedAt: Scalars['String']['output'];
  /** How many of each spec's fastest runs were sampled per dungeon. */
  sampleDepth: Scalars['Int']['output'];
  specs: Array<SpecStat>;
  totalParses: Scalars['Int']['output'];
  zoneId: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  character?: Maybe<Character>;
  characterSuggestions: Array<SearchResult>;
  /**
   * Internal companion telemetry. Requires COMPANION_TELEMETRY_TOKEN; with the
   * variable unset the field is always forbidden, so a deploy that forgets it
   * cannot publish install data.
   */
  companionTelemetry: CompanionTelemetry;
  mythicPlusSpecStats?: Maybe<MythicPlusSpecStats>;
  roster?: Maybe<Roster>;
  rosterCharacters: Array<RosterEntry>;
  siteStats: SiteStats;
  zonePartitions: Array<ZonePartition>;
};


export type QueryCharacterArgs = {
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
  difficulty?: InputMaybe<Difficulty>;
  metric?: InputMaybe<Metric>;
  name: Scalars['String']['input'];
  partition?: InputMaybe<Scalars['Int']['input']>;
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCharacterSuggestionsArgs = {
  region: Scalars['String']['input'];
  searchString: Scalars['String']['input'];
};


export type QueryCompanionTelemetryArgs = {
  token: Scalars['String']['input'];
};


export type QueryMythicPlusSpecStatsArgs = {
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRosterArgs = {
  region: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};


export type QueryRosterCharactersArgs = {
  characters: Array<RosterCharacterInput>;
  difficulty?: InputMaybe<Difficulty>;
  region: Scalars['String']['input'];
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryZonePartitionsArgs = {
  zoneId: Scalars['Int']['input'];
};

export type RaidLogs = ZoneLogs & {
  __typename?: 'RaidLogs';
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  difficulty?: Maybe<Difficulty>;
  medianPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  metric?: Maybe<Metric>;
  raidRankings?: Maybe<Array<RaidRanking>>;
};

/**
 * Bosses killed per difficulty in one raid, keyed by the season config's raid
 * slug (which also holds the boss count). Raids without a kill are omitted.
 */
export type RaidProgress = {
  __typename?: 'RaidProgress';
  heroic: Scalars['Int']['output'];
  mythic: Scalars['Int']['output'];
  normal: Scalars['Int']['output'];
  raid: Scalars['String']['output'];
};

export type RaidRanking = {
  __typename?: 'RaidRanking';
  bestAmount?: Maybe<Scalars['Float']['output']>;
  bestRank?: Maybe<BestRank>;
  encounter?: Maybe<Encounter>;
  medianPercent?: Maybe<Scalars['Float']['output']>;
  rankPercent?: Maybe<Scalars['Float']['output']>;
  spec?: Maybe<Scalars['String']['output']>;
  totalKills?: Maybe<Scalars['Int']['output']>;
};

export type RecentSearch = {
  __typename?: 'RecentSearch';
  class?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  searchedAt: Scalars['String']['output'];
  specialization?: Maybe<Scalars['String']['output']>;
};

export type RegionCount = {
  __typename?: 'RegionCount';
  count: Scalars['Int']['output'];
  region: Scalars['String']['output'];
};

export enum RoleType {
  Any = 'Any',
  Dps = 'DPS',
  Healer = 'Healer',
  Tank = 'Tank'
}

/**
 * A saved Roster Check share link. The creator can edit it in place with the
 * editSecret; anyone else forks it into a new slug.
 */
export type Roster = {
  __typename?: 'Roster';
  characters: Array<RosterCharacterKey>;
  /**
   * Only present in the createRoster response - the caller stores it client-side
   * to edit the roster later. Never returned by Query.roster.
   */
  editSecret?: Maybe<Scalars['String']['output']>;
  region: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type RosterCharacterInput = {
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  /**
   * Role the character is being considered as - the Group Finder role an
   * applicant signed up with, which the spec does not always imply (a healer
   * Evoker in Devastation gear applies as a healer). Decides whether parses
   * are ranked on healing or damage; falls back to the active spec's role.
   */
  role?: InputMaybe<SpecRole>;
};

export type RosterCharacterKey = {
  __typename?: 'RosterCharacterKey';
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
};

/**
 * One character in a roster lookup. notFound is expected user input (typo'd
 * name/realm), never an error; character is null in that case.
 */
export type RosterEntry = {
  __typename?: 'RosterEntry';
  character?: Maybe<Character>;
  name: Scalars['String']['output'];
  notFound: Scalars['Boolean']['output'];
  /**
   * Blizzard's display name when the character was found (Der Rat von Dalaran),
   * otherwise the resolved slug.
   */
  realm: Scalars['String']['output'];
  /**
   * Canonical API slug (der-rat-von-dalaran). Build character URLs from this;
   * clients carry no realm table of their own.
   */
  realmSlug: Scalars['String']['output'];
  role?: Maybe<SpecRole>;
};

export type SearchResult = {
  __typename?: 'SearchResult';
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
  /** Canonical API slug; build the character URL from this. */
  realmSlug: Scalars['String']['output'];
  region: Scalars['String']['output'];
};

export type SiteStats = {
  __typename?: 'SiteStats';
  classDistribution: Array<ClassCount>;
  newCharactersThisWeek: Scalars['Int']['output'];
  realmsTracked: Scalars['Int']['output'];
  recentSearches: Array<RecentSearch>;
  regionBreakdown: Array<RegionCount>;
  searchesPerDay: Array<DailySearchCount>;
  searchesToday: Scalars['Int']['output'];
  searchesYesterday: Scalars['Int']['output'];
  totalCharacters: Scalars['Int']['output'];
  trendingCharacters: Array<TrendingCharacter>;
};

export type SpecDungeonStat = {
  __typename?: 'SpecDungeonStat';
  encounterId: Scalars['Int']['output'];
  max: Scalars['Float']['output'];
  /** Keystone level of the single best parse. Null for pre-existing rows. */
  maxKey?: Maybe<Scalars['Int']['output']>;
  /** WarcraftLogs report link for the single best parse. */
  maxReportUrl?: Maybe<Scalars['String']['output']>;
  median: Scalars['Float']['output'];
  medianKey: Scalars['Int']['output'];
  p95: Scalars['Float']['output'];
  parses: Scalars['Int']['output'];
};

/** One hero talent tree's slice of a spec — same statistics, smaller sample. */
export type SpecHeroTalentStat = {
  __typename?: 'SpecHeroTalentStat';
  dungeons: Array<SpecDungeonStat>;
  max: Scalars['Float']['output'];
  /** Keystone level of the single best parse. */
  maxKey?: Maybe<Scalars['Int']['output']>;
  /** WarcraftLogs report link for the single best parse. */
  maxReportUrl?: Maybe<Scalars['String']['output']>;
  median: Scalars['Float']['output'];
  medianKey: Scalars['Int']['output'];
  /** Hero talent tree name, e.g. Sunfury. */
  name: Scalars['String']['output'];
  p95: Scalars['Float']['output'];
  parses: Scalars['Int']['output'];
};

export enum SpecRole {
  Dps = 'DPS',
  Healer = 'HEALER',
  Tank = 'TANK'
}

export type SpecStat = {
  __typename?: 'SpecStat';
  className: Scalars['String']['output'];
  classSlug: Scalars['String']['output'];
  dungeons: Array<SpecDungeonStat>;
  /** The same numbers per hero talent tree. Trees do not sum to the spec: runs whose log carried no combatant info belong to no tree. */
  heroTalents: Array<SpecHeroTalentStat>;
  /** The raw best parse in the sample, findable on WarcraftLogs. */
  max: Scalars['Float']['output'];
  /** Keystone level of the single best parse. Null for pre-existing rows. */
  maxKey?: Maybe<Scalars['Int']['output']>;
  /** WarcraftLogs report link for the single best parse. */
  maxReportUrl?: Maybe<Scalars['String']['output']>;
  /** Adjusted for dungeon and key mix — will not match any single WCL parse. */
  median: Scalars['Float']['output'];
  medianKey: Scalars['Int']['output'];
  /** dps for damage specs and tanks, hps for healers. */
  metric: Scalars['String']['output'];
  /** Adjusted for dungeon and key mix — will not match any single WCL parse. */
  p95: Scalars['Float']['output'];
  parses: Scalars['Int']['output'];
  role: SpecRole;
  specName: Scalars['String']['output'];
  specSlug: Scalars['String']['output'];
};

export type TierSetSummary = {
  __typename?: 'TierSetSummary';
  equippedCount: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type TrendingCharacter = {
  __typename?: 'TrendingCharacter';
  class?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  searches: Scalars['Int']['output'];
};

export type ZoneLogs = {
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  medianPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  metric?: Maybe<Metric>;
};

export type ZonePartition = {
  __typename?: 'ZonePartition';
  compactName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type CharacterGearQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterGearQuery = { __typename?: 'Query', character?: { __typename?: 'Character', gear?: { __typename?: 'Gear', equippedItemLevel: number, items: Array<{ __typename?: 'GearItem', slot: string, itemId: number, name: string, quality: string, itemLevel: number, iconUrl?: string | null, enchantId?: number | null, bonusIds: Array<number>, missingEnchant: boolean, tierSetId?: number | null, sockets: Array<{ __typename?: 'GearSocket', filled: boolean, itemId?: number | null }> }>, tierSets: Array<{ __typename?: 'TierSetSummary', id: number, name: string, equippedCount: number }> } | null } | null };

export type CharacterInfoQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterInfoQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, realmSlug: string, region: string, class?: string | null, race?: string | null, activeSpec?: string | null, faction?: string | null, gender?: string | null, level?: number | null, equippedItemLevel?: number | null, averageItemLevel?: number | null, achievementPoints?: number | null, avatarUrl?: string | null, guild?: { __typename?: 'Guild', name: string, realm: string } | null, potentialAlts: Array<{ __typename?: 'AltCharacter', name: string, realm: string, region: string, class?: string | null, avatarUrl?: string | null, itemLevel?: number | null, mythicPlus?: { __typename?: 'MythicPlus', currentSeason?: { __typename?: 'MythicPlusSeason', rating: number, color?: string | null } | null } | null, raidProgression?: Array<{ __typename?: 'RaidProgress', raid: string, normal: number, heroic: number, mythic: number }> | null }> } | null };

export type CharacterMythicPlusLogsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  metric?: InputMaybe<Metric>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
  partition?: InputMaybe<Scalars['Int']['input']>;
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterMythicPlusLogsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', mythicPlusLogs?: { __typename?: 'MythicPlusLogs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null, dungeonRankings?: Array<{ __typename?: 'MythicPlusRanking', spec?: string | null, rankPercent?: number | null, medianPercent?: number | null, bestScore?: number | null, throughputPercent?: number | null, medianThroughputPercent?: number | null, bestThroughput?: number | null, bestLevel?: number | null, lowParses?: boolean | null, totalRuns?: number | null, dungeon?: { __typename?: 'Encounter', id: number, name: string } | null }> | null } | null } | null };

export type CharacterProgressionQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterProgressionQuery = { __typename?: 'Query', character?: { __typename?: 'Character', mythicPlus?: { __typename?: 'MythicPlus', currentSeason?: { __typename?: 'MythicPlusSeason', season?: string | null, rating: number, color?: string | null, bestRuns: Array<{ __typename?: 'MythicPlusRun', dungeonId: number, dungeon: string, keyLevel: number, completedAt: string, upgrades: number, spec?: string | null, url?: string | null }> } | null, previousSeason?: { __typename?: 'MythicPlusSeason', season?: string | null, rating: number, color?: string | null, bestRuns: Array<{ __typename?: 'MythicPlusRun', dungeonId: number, dungeon: string, keyLevel: number, completedAt: string, upgrades: number, spec?: string | null, url?: string | null }> } | null } | null, raidProgression?: Array<{ __typename?: 'RaidProgress', raid: string, normal: number, heroic: number, mythic: number }> | null } | null };

export type CharacterRecentRunsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterRecentRunsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', recentMythicPlusRuns?: Array<{ __typename?: 'MythicPlusRun', dungeonId: number, dungeon: string, keyLevel: number, completedAt: string, upgrades: number, spec?: string | null, url?: string | null }> | null } | null };

export type CharacterRaidLogsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
  metric?: InputMaybe<Metric>;
  difficulty?: InputMaybe<Difficulty>;
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
  partition?: InputMaybe<Scalars['Int']['input']>;
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterRaidLogsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', raidLogs?: { __typename?: 'RaidLogs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null, difficulty?: Difficulty | null, raidRankings?: Array<{ __typename?: 'RaidRanking', spec?: string | null, rankPercent?: number | null, medianPercent?: number | null, bestAmount?: number | null, totalKills?: number | null, encounter?: { __typename?: 'Encounter', id: number, name: string } | null, bestRank?: { __typename?: 'BestRank', ilvl?: number | null } | null }> | null } | null } | null };

export type CharacterSearchQueryVariables = Exact<{
  searchString: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSearchQuery = { __typename?: 'Query', characterSuggestions: Array<{ __typename?: 'SearchResult', name: string, realm: string, realmSlug: string, region: string }> };

export type CompanionTelemetryQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type CompanionTelemetryQuery = { __typename?: 'Query', companionTelemetry: { __typename?: 'CompanionTelemetry', windowDays: number, newestReport?: string | null, beatsThisWeek: number, newThisWindow: number, runtimeBeats: number, funnel: { __typename?: 'CompanionFunnel', installs: number, activated: number, activeThisWeek: number, never: number, neverNoWindow: number }, links: Array<{ __typename?: 'CompanionLinkStat', link: string, beats: number, installs: number }>, growth: Array<{ __typename?: 'CompanionDailyCount', date: string, count: number }>, versions: Array<{ __typename?: 'CompanionVersionCount', version: string, count: number }>, stranded: Array<{ __typename?: 'CompanionStranded', from: string, to: string, installs: number, failures: number }>, cohorts: Array<{ __typename?: 'CompanionCohort', start: string, end: string, size: number, day1: number, day7: number, pending: boolean, daysToWait: number }>, runtime: Array<{ __typename?: 'CompanionDailyCount', date: string, count: number }>, sessions: Array<{ __typename?: 'CompanionSessionBucket', bucket: string, percent: number }>, lookups: { __typename?: 'CompanionLookups', total: number, notFound: number, errors: number }, cap: { __typename?: 'CompanionCap', limit: number, beats: number, installs: number, maxTotal: number }, installs: Array<{ __typename?: 'CompanionInstallRow', installId: string, firstSeen: string, lastSeen: string, version: string, region?: string | null, country?: string | null, activatedAt?: string | null, link?: string | null }>, regions: Array<{ __typename?: 'CompanionRegionCount', region: string, count: number }>, countries: Array<{ __typename?: 'CompanionCountryCount', country: string, count: number }> } };

export type MythicPlusSpecStatsQueryVariables = Exact<{
  zoneId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MythicPlusSpecStatsQuery = { __typename?: 'Query', mythicPlusSpecStats?: { __typename?: 'MythicPlusSpecStats', zoneId: number, refreshedAt: string, keyFloor: number, keyLevels: Array<number>, totalParses: number, minParsesToRank: number, minParsesToRankHero: number, sampleDepth: number, minKeyLevel: number, dungeons: Array<{ __typename?: 'MythicPlusDungeon', encounterId: number, name: string }>, specs: Array<{ __typename?: 'SpecStat', classSlug: string, specSlug: string, className: string, specName: string, role: SpecRole, metric: string, parses: number, median: number, p95: number, max: number, medianKey: number, maxKey?: number | null, maxReportUrl?: string | null, dungeons: Array<{ __typename?: 'SpecDungeonStat', encounterId: number, parses: number, median: number, p95: number, max: number, medianKey: number, maxKey?: number | null, maxReportUrl?: string | null }>, heroTalents: Array<{ __typename?: 'SpecHeroTalentStat', name: string, parses: number, median: number, p95: number, max: number, medianKey: number, maxKey?: number | null, maxReportUrl?: string | null, dungeons: Array<{ __typename?: 'SpecDungeonStat', encounterId: number, parses: number, median: number, p95: number, max: number, medianKey: number, maxKey?: number | null, maxReportUrl?: string | null }> }> }> } | null };

export type CreateRosterMutationVariables = Exact<{
  region: Scalars['String']['input'];
  characters: Array<RosterCharacterInput> | RosterCharacterInput;
}>;


export type CreateRosterMutation = { __typename?: 'Mutation', createRoster: { __typename?: 'Roster', slug: string, region: string, editSecret?: string | null, characters: Array<{ __typename?: 'RosterCharacterKey', name: string, realm: string }> } };

export type UpdateRosterMutationVariables = Exact<{
  region: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  editSecret: Scalars['String']['input'];
  characters: Array<RosterCharacterInput> | RosterCharacterInput;
}>;


export type UpdateRosterMutation = { __typename?: 'Mutation', updateRoster: { __typename?: 'Roster', slug: string, region: string, characters: Array<{ __typename?: 'RosterCharacterKey', name: string, realm: string }> } };

export type RosterQueryVariables = Exact<{
  region: Scalars['String']['input'];
  slug: Scalars['String']['input'];
}>;


export type RosterQuery = { __typename?: 'Query', roster?: { __typename?: 'Roster', slug: string, region: string, characters: Array<{ __typename?: 'RosterCharacterKey', name: string, realm: string }> } | null };

export type RosterCoreQueryVariables = Exact<{
  region: Scalars['String']['input'];
  characters: Array<RosterCharacterInput> | RosterCharacterInput;
}>;


export type RosterCoreQuery = { __typename?: 'Query', rosterCharacters: Array<{ __typename?: 'RosterEntry', name: string, realm: string, notFound: boolean, role?: SpecRole | null, character?: { __typename?: 'Character', name: string, realm: string, realmSlug: string, region: string, class?: string | null, activeSpec?: string | null, level?: number | null, equippedItemLevel?: number | null, avatarUrl?: string | null, guild?: { __typename?: 'Guild', name: string } | null } | null }> };

export type RosterProgressionQueryVariables = Exact<{
  region: Scalars['String']['input'];
  characters: Array<RosterCharacterInput> | RosterCharacterInput;
}>;


export type RosterProgressionQuery = { __typename?: 'Query', rosterCharacters: Array<{ __typename?: 'RosterEntry', name: string, realm: string, notFound: boolean, character?: { __typename?: 'Character', mythicPlus?: { __typename?: 'MythicPlus', currentSeason?: { __typename?: 'MythicPlusSeason', rating: number, color?: string | null } | null } | null, raidProgression?: Array<{ __typename?: 'RaidProgress', raid: string, normal: number, heroic: number, mythic: number }> | null } | null }> };

export type RosterLogsQueryVariables = Exact<{
  region: Scalars['String']['input'];
  characters: Array<RosterCharacterInput> | RosterCharacterInput;
  difficulty?: InputMaybe<Difficulty>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RosterLogsQuery = { __typename?: 'Query', rosterCharacters: Array<{ __typename?: 'RosterEntry', name: string, realm: string, notFound: boolean, character?: { __typename?: 'Character', raidLogs?: { __typename?: 'RaidLogs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null } | null } | null }> };

export type SiteStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type SiteStatsQuery = { __typename?: 'Query', siteStats: { __typename?: 'SiteStats', totalCharacters: number, newCharactersThisWeek: number, realmsTracked: number, searchesToday: number, searchesYesterday: number, searchesPerDay: Array<{ __typename?: 'DailySearchCount', date: string, count: number }>, regionBreakdown: Array<{ __typename?: 'RegionCount', region: string, count: number }>, classDistribution: Array<{ __typename?: 'ClassCount', class: string, count: number }>, recentSearches: Array<{ __typename?: 'RecentSearch', name: string, realm: string, region: string, class?: string | null, specialization?: string | null, searchedAt: string }>, trendingCharacters: Array<{ __typename?: 'TrendingCharacter', name: string, realm: string, region: string, class?: string | null, searches: number }> } };

export type ZonePartitionsQueryVariables = Exact<{
  zoneId: Scalars['Int']['input'];
}>;


export type ZonePartitionsQuery = { __typename?: 'Query', zonePartitions: Array<{ __typename?: 'ZonePartition', id: number, name: string, compactName: string, isDefault: boolean }> };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const CharacterGearDocument = new TypedDocumentString(`
    query CharacterGear($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    bypassCache: $bypassCache
  ) {
    gear {
      equippedItemLevel
      items {
        slot
        itemId
        name
        quality
        itemLevel
        iconUrl
        enchantId
        bonusIds
        missingEnchant
        sockets {
          filled
          itemId
        }
        tierSetId
      }
      tierSets {
        id
        name
        equippedCount
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterGearQuery, CharacterGearQueryVariables>;
export const CharacterInfoDocument = new TypedDocumentString(`
    query CharacterInfo($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    bypassCache: $bypassCache
  ) {
    name
    realm
    realmSlug
    region
    class
    race
    activeSpec
    faction
    gender
    level
    equippedItemLevel
    averageItemLevel
    achievementPoints
    guild {
      name
      realm
    }
    avatarUrl
    potentialAlts {
      name
      realm
      region
      class
      avatarUrl
      itemLevel
      mythicPlus {
        currentSeason {
          rating
          color
        }
      }
      raidProgression {
        raid
        normal
        heroic
        mythic
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterInfoQuery, CharacterInfoQueryVariables>;
export const CharacterMythicPlusLogsDocument = new TypedDocumentString(`
    query CharacterMythicPlusLogs($name: String!, $realm: String!, $region: String!, $metric: Metric, $zoneId: Int, $partition: Int, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    metric: $metric
    zoneId: $zoneId
    partition: $partition
    bypassCache: $bypassCache
  ) {
    mythicPlusLogs {
      bestPerformanceAverage
      medianPerformanceAverage
      metric
      dungeonRankings {
        spec
        dungeon {
          id
          name
        }
        rankPercent
        medianPercent
        bestScore
        throughputPercent
        medianThroughputPercent
        bestThroughput
        bestLevel
        lowParses
        totalRuns
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterMythicPlusLogsQuery, CharacterMythicPlusLogsQueryVariables>;
export const CharacterProgressionDocument = new TypedDocumentString(`
    query CharacterProgression($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    bypassCache: $bypassCache
  ) {
    mythicPlus {
      currentSeason {
        season
        rating
        color
        bestRuns {
          dungeonId
          dungeon
          keyLevel
          completedAt
          upgrades
          spec
          url
        }
      }
      previousSeason {
        season
        rating
        color
        bestRuns {
          dungeonId
          dungeon
          keyLevel
          completedAt
          upgrades
          spec
          url
        }
      }
    }
    raidProgression {
      raid
      normal
      heroic
      mythic
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterProgressionQuery, CharacterProgressionQueryVariables>;
export const CharacterRecentRunsDocument = new TypedDocumentString(`
    query CharacterRecentRuns($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    bypassCache: $bypassCache
  ) {
    recentMythicPlusRuns {
      dungeonId
      dungeon
      keyLevel
      completedAt
      upgrades
      spec
      url
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterRecentRunsQuery, CharacterRecentRunsQueryVariables>;
export const CharacterRaidLogsDocument = new TypedDocumentString(`
    query CharacterRaidLogs($name: String!, $realm: String!, $region: String!, $role: RoleType, $metric: Metric, $difficulty: Difficulty, $byBracket: Boolean, $zoneId: Int, $partition: Int, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    role: $role
    metric: $metric
    difficulty: $difficulty
    byBracket: $byBracket
    zoneId: $zoneId
    partition: $partition
    bypassCache: $bypassCache
  ) {
    raidLogs {
      bestPerformanceAverage
      medianPerformanceAverage
      metric
      difficulty
      raidRankings {
        spec
        encounter {
          id
          name
        }
        rankPercent
        medianPercent
        bestAmount
        totalKills
        bestRank {
          ilvl
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterRaidLogsQuery, CharacterRaidLogsQueryVariables>;
export const CharacterSearchDocument = new TypedDocumentString(`
    query CharacterSearch($searchString: String!, $region: String!) {
  characterSuggestions(searchString: $searchString, region: $region) {
    name
    realm
    realmSlug
    region
  }
}
    `) as unknown as TypedDocumentString<CharacterSearchQuery, CharacterSearchQueryVariables>;
export const CompanionTelemetryDocument = new TypedDocumentString(`
    query CompanionTelemetry($token: String!) {
  companionTelemetry(token: $token) {
    windowDays
    newestReport
    beatsThisWeek
    newThisWindow
    runtimeBeats
    funnel {
      installs
      activated
      activeThisWeek
      never
      neverNoWindow
    }
    links {
      link
      beats
      installs
    }
    growth {
      date
      count
    }
    versions {
      version
      count
    }
    stranded {
      from
      to
      installs
      failures
    }
    cohorts {
      start
      end
      size
      day1
      day7
      pending
      daysToWait
    }
    runtime {
      date
      count
    }
    sessions {
      bucket
      percent
    }
    lookups {
      total
      notFound
      errors
    }
    cap {
      limit
      beats
      installs
      maxTotal
    }
    installs {
      installId
      firstSeen
      lastSeen
      version
      region
      country
      activatedAt
      link
    }
    regions {
      region
      count
    }
    countries {
      country
      count
    }
  }
}
    `) as unknown as TypedDocumentString<CompanionTelemetryQuery, CompanionTelemetryQueryVariables>;
export const MythicPlusSpecStatsDocument = new TypedDocumentString(`
    query MythicPlusSpecStats($zoneId: Int) {
  mythicPlusSpecStats(zoneId: $zoneId) {
    zoneId
    refreshedAt
    keyFloor
    keyLevels
    totalParses
    minParsesToRank
    minParsesToRankHero
    sampleDepth
    minKeyLevel
    dungeons {
      encounterId
      name
    }
    specs {
      classSlug
      specSlug
      className
      specName
      role
      metric
      parses
      median
      p95
      max
      medianKey
      maxKey
      maxReportUrl
      dungeons {
        encounterId
        parses
        median
        p95
        max
        medianKey
        maxKey
        maxReportUrl
      }
      heroTalents {
        name
        parses
        median
        p95
        max
        medianKey
        maxKey
        maxReportUrl
        dungeons {
          encounterId
          parses
          median
          p95
          max
          medianKey
          maxKey
          maxReportUrl
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MythicPlusSpecStatsQuery, MythicPlusSpecStatsQueryVariables>;
export const CreateRosterDocument = new TypedDocumentString(`
    mutation CreateRoster($region: String!, $characters: [RosterCharacterInput!]!) {
  createRoster(region: $region, characters: $characters) {
    slug
    region
    characters {
      name
      realm
    }
    editSecret
  }
}
    `) as unknown as TypedDocumentString<CreateRosterMutation, CreateRosterMutationVariables>;
export const UpdateRosterDocument = new TypedDocumentString(`
    mutation UpdateRoster($region: String!, $slug: String!, $editSecret: String!, $characters: [RosterCharacterInput!]!) {
  updateRoster(
    region: $region
    slug: $slug
    editSecret: $editSecret
    characters: $characters
  ) {
    slug
    region
    characters {
      name
      realm
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateRosterMutation, UpdateRosterMutationVariables>;
export const RosterDocument = new TypedDocumentString(`
    query Roster($region: String!, $slug: String!) {
  roster(region: $region, slug: $slug) {
    slug
    region
    characters {
      name
      realm
    }
  }
}
    `) as unknown as TypedDocumentString<RosterQuery, RosterQueryVariables>;
export const RosterCoreDocument = new TypedDocumentString(`
    query RosterCore($region: String!, $characters: [RosterCharacterInput!]!) {
  rosterCharacters(region: $region, characters: $characters) {
    name
    realm
    notFound
    role
    character {
      name
      realm
      realmSlug
      region
      class
      activeSpec
      level
      equippedItemLevel
      avatarUrl
      guild {
        name
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RosterCoreQuery, RosterCoreQueryVariables>;
export const RosterProgressionDocument = new TypedDocumentString(`
    query RosterProgression($region: String!, $characters: [RosterCharacterInput!]!) {
  rosterCharacters(region: $region, characters: $characters) {
    name
    realm
    notFound
    character {
      mythicPlus {
        currentSeason {
          rating
          color
        }
      }
      raidProgression {
        raid
        normal
        heroic
        mythic
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RosterProgressionQuery, RosterProgressionQueryVariables>;
export const RosterLogsDocument = new TypedDocumentString(`
    query RosterLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty, $zoneId: Int) {
  rosterCharacters(
    region: $region
    characters: $characters
    difficulty: $difficulty
    zoneId: $zoneId
  ) {
    name
    realm
    notFound
    character {
      raidLogs {
        bestPerformanceAverage
        medianPerformanceAverage
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RosterLogsQuery, RosterLogsQueryVariables>;
export const SiteStatsDocument = new TypedDocumentString(`
    query SiteStats {
  siteStats {
    totalCharacters
    newCharactersThisWeek
    realmsTracked
    searchesToday
    searchesYesterday
    searchesPerDay {
      date
      count
    }
    regionBreakdown {
      region
      count
    }
    classDistribution {
      class
      count
    }
    recentSearches {
      name
      realm
      region
      class
      specialization
      searchedAt
    }
    trendingCharacters {
      name
      realm
      region
      class
      searches
    }
  }
}
    `) as unknown as TypedDocumentString<SiteStatsQuery, SiteStatsQueryVariables>;
export const ZonePartitionsDocument = new TypedDocumentString(`
    query ZonePartitions($zoneId: Int!) {
  zonePartitions(zoneId: $zoneId) {
    id
    name
    compactName
    isDefault
  }
}
    `) as unknown as TypedDocumentString<ZonePartitionsQuery, ZonePartitionsQueryVariables>;