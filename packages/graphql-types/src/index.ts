export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
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
  mythicPlusColor?: Maybe<Scalars['String']['output']>;
  mythicPlusScore?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  raidProgression?: Maybe<Array<RaidProgressionDetail>>;
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
  mythicPlusLogs?: Maybe<MythicPlusLogs>;
  name: Scalars['String']['output'];
  potentialAlts: Array<AltCharacter>;
  race?: Maybe<Scalars['String']['output']>;
  raidLogs?: Maybe<RaidLogs>;
  raiderIo?: Maybe<RaiderIo>;
  realm: Scalars['String']['output'];
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

export type DailySearchCount = {
  __typename?: 'DailySearchCount';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type Difficulty =
  | 'Heroic'
  | 'LFR'
  | 'Mythic'
  | 'Normal';

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

export type Metric =
  | 'dps'
  | 'hps'
  | 'points_and_damage'
  | 'points_and_healing';

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

export type MythicPlusClass = {
  __typename?: 'MythicPlusClass';
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
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
  background_image_url: Scalars['String']['output'];
  challange_mode_id: Scalars['Int']['output'];
  class?: Maybe<MythicPlusClass>;
  completed_at: Scalars['String']['output'];
  dungeon: Scalars['String']['output'];
  icon_url: Scalars['String']['output'];
  key_level: Scalars['Int']['output'];
  keystone_upgrades: Scalars['Int']['output'];
  role: Scalars['String']['output'];
  short_name: Scalars['String']['output'];
  spec?: Maybe<MythicPlusSpec>;
  url: Scalars['String']['output'];
};

export type MythicPlusSpec = {
  __typename?: 'MythicPlusSpec';
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
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

export type RaidProgressionDetail = {
  __typename?: 'RaidProgressionDetail';
  expansion_id?: Maybe<Scalars['Int']['output']>;
  heroic_bosses_killed?: Maybe<Scalars['Int']['output']>;
  mythic_bosses_killed?: Maybe<Scalars['Int']['output']>;
  normal_bosses_killed?: Maybe<Scalars['Int']['output']>;
  raid: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  total_bosses?: Maybe<Scalars['Int']['output']>;
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

export type RaiderIo = {
  __typename?: 'RaiderIo';
  bestMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  currentSeason?: Maybe<SeasonScores>;
  previousSeason?: Maybe<SeasonScores>;
  raidProgression?: Maybe<Array<RaidProgressionDetail>>;
  recentMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
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

export type RoleType =
  | 'Any'
  | 'DPS'
  | 'Healer'
  | 'Tank';

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
  realm: Scalars['String']['output'];
  role?: Maybe<SpecRole>;
};

export type SearchResult = {
  __typename?: 'SearchResult';
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
};

export type SeasonScores = {
  __typename?: 'SeasonScores';
  all?: Maybe<Segment>;
  dps?: Maybe<Segment>;
  healer?: Maybe<Segment>;
  season?: Maybe<Scalars['String']['output']>;
  tank?: Maybe<Segment>;
};

export type Segment = {
  __typename?: 'Segment';
  color: Scalars['String']['output'];
  score: Scalars['Float']['output'];
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

export type SpecRole =
  | 'DPS'
  | 'HEALER'
  | 'TANK';

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
