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

export type Character = {
  __typename?: 'Character';
  fetchedAt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  raiderIo?: Maybe<RaiderIo>;
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  warcraftLogs?: Maybe<Logs>;
};


export type CharacterWarcraftLogsArgs = {
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
  metric?: InputMaybe<Metric>;
  role?: InputMaybe<RoleType>;
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

export type Logs = {
  __typename?: 'Logs';
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  difficulty?: Maybe<Difficulty>;
  medianPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  metric?: Maybe<Metric>;
  raidRankings?: Maybe<Array<RaidRanking>>;
};

export type Metric =
  | 'dps'
  | 'hps';

export type MythicPlusClass = {
  __typename?: 'MythicPlusClass';
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
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
};


export type QueryCharacterArgs = {
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
  difficulty?: InputMaybe<Difficulty>;
  metric?: InputMaybe<Metric>;
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCharacterSuggestionsArgs = {
  region: Scalars['String']['input'];
  searchString: Scalars['String']['input'];
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
  encounter?: Maybe<Encounter>;
  medianPercent?: Maybe<Scalars['Float']['output']>;
  rankPercent?: Maybe<Scalars['Float']['output']>;
  spec?: Maybe<Scalars['String']['output']>;
  totalKills?: Maybe<Scalars['Int']['output']>;
};

export type RaiderIo = {
  __typename?: 'RaiderIo';
  bestMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  class?: Maybe<Scalars['String']['output']>;
  currentSeason?: Maybe<SeasonScores>;
  gear?: Maybe<Scalars['String']['output']>;
  itlvl?: Maybe<Scalars['Float']['output']>;
  previousSeason?: Maybe<SeasonScores>;
  race?: Maybe<Scalars['String']['output']>;
  raidProgression?: Maybe<Array<RaidProgressionDetail>>;
  recentMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  specialization?: Maybe<Scalars['String']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
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
