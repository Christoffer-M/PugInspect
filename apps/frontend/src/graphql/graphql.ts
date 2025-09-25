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

export type Logs = {
  __typename?: 'Logs';
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  difficulty?: Maybe<Difficulty>;
  medianPerformanceAverage?: Maybe<Scalars['Float']['output']>;
  metric?: Maybe<Metric>;
  raidRankings?: Maybe<Array<RaidRanking>>;
};

export enum Metric {
  Dps = 'dps',
  Hps = 'hps'
}

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
  all?: Maybe<Segment>;
  class?: Maybe<Scalars['String']['output']>;
  dps?: Maybe<Segment>;
  healer?: Maybe<Segment>;
  race?: Maybe<Scalars['String']['output']>;
  raidProgression?: Maybe<Array<RaidProgressionDetail>>;
  tank?: Maybe<Segment>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};

export enum RoleType {
  Any = 'Any',
  Dps = 'DPS',
  Healer = 'Healer',
  Tank = 'Tank'
}

export type Segment = {
  __typename?: 'Segment';
  color: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};

export type CharacterLogsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
  metric?: InputMaybe<Metric>;
  difficulty?: InputMaybe<Difficulty>;
}>;


export type CharacterLogsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', warcraftLogs?: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null, difficulty?: Difficulty | null, raidRankings?: Array<{ __typename?: 'RaidRanking', spec?: string | null, rankPercent?: number | null, medianPercent?: number | null, bestAmount?: number | null, totalKills?: number | null, encounter?: { __typename?: 'Encounter', id: number, name: string } | null }> | null } | null } | null };

export type CharacterSummaryQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSummaryQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, region: string, warcraftLogs?: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null } | null, raiderIo?: { __typename?: 'RaiderIo', thumbnailUrl?: string | null, race?: string | null, class?: string | null, raidProgression?: Array<{ __typename?: 'RaidProgressionDetail', raid: string, total_bosses?: number | null, heroic_bosses_killed?: number | null, mythic_bosses_killed?: number | null, normal_bosses_killed?: number | null }> | null, all?: { __typename?: 'Segment', score: number, color: string } | null } | null } | null };

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

export const CharacterLogsDocument = new TypedDocumentString(`
    query CharacterLogs($name: String!, $realm: String!, $region: String!, $role: RoleType, $metric: Metric, $difficulty: Difficulty) {
  character(
    name: $name
    realm: $realm
    region: $region
    role: $role
    metric: $metric
    difficulty: $difficulty
  ) {
    warcraftLogs {
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
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterLogsQuery, CharacterLogsQueryVariables>;
export const CharacterSummaryDocument = new TypedDocumentString(`
    query CharacterSummary($name: String!, $realm: String!, $region: String!) {
  character(name: $name, realm: $realm, region: $region) {
    warcraftLogs {
      bestPerformanceAverage
      medianPerformanceAverage
      metric
    }
    name
    realm
    region
    raiderIo {
      thumbnailUrl
      race
      class
      raidProgression {
        raid
        total_bosses
        heroic_bosses_killed
        mythic_bosses_killed
        normal_bosses_killed
      }
      all {
        score
        color
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterSummaryQuery, CharacterSummaryQueryVariables>;