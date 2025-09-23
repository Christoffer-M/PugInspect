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
  name: Scalars['String']['output'];
  raiderIo?: Maybe<RaiderIo>;
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  warcraftLogs?: Maybe<Logs>;
};


export type CharacterWarcraftLogsArgs = {
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

export type Query = {
  __typename?: 'Query';
  character?: Maybe<Character>;
};


export type QueryCharacterArgs = {
  difficulty?: InputMaybe<Difficulty>;
  metric?: InputMaybe<Metric>;
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
};

export type RaidRanking = {
  __typename?: 'RaidRanking';
  bestAmount?: Maybe<Scalars['Float']['output']>;
  encounter?: Maybe<Encounter>;
  medianPercent?: Maybe<Scalars['Float']['output']>;
  rankPercent?: Maybe<Scalars['Float']['output']>;
  totalKills?: Maybe<Scalars['Int']['output']>;
};

export type RaiderIo = {
  __typename?: 'RaiderIo';
  all?: Maybe<Segment>;
  dps?: Maybe<Segment>;
  healer?: Maybe<Segment>;
  race?: Maybe<Scalars['String']['output']>;
  tank?: Maybe<Segment>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};

export type RoleType =
  | 'Any'
  | 'DPS'
  | 'Healer'
  | 'Tank';

export type Segment = {
  __typename?: 'Segment';
  color: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};
