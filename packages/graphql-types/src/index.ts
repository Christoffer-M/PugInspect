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

export type MythicPlusClass = {
  __typename?: 'MythicPlusClass';
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
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

export type Query = {
  __typename?: 'Query';
  character?: Maybe<Character>;
  characterSuggestions: Array<SearchResult>;
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
