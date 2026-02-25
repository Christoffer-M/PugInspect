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
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
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
  difficulty?: InputMaybe<Difficulty>;
  metric?: InputMaybe<Metric>;
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  role?: InputMaybe<RoleType>;
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
  all?: Maybe<Segment>;
  bestMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  class?: Maybe<Scalars['String']['output']>;
  dps?: Maybe<Segment>;
  gear?: Maybe<Scalars['String']['output']>;
  healer?: Maybe<Segment>;
  itlvl?: Maybe<Scalars['Float']['output']>;
  race?: Maybe<Scalars['String']['output']>;
  raidProgression?: Maybe<Array<RaidProgressionDetail>>;
  recentMythicPlusRuns?: Maybe<Array<MythicPlusRun>>;
  specialization?: Maybe<Scalars['String']['output']>;
  tank?: Maybe<Segment>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};

export enum RoleType {
  Any = 'Any',
  Dps = 'DPS',
  Healer = 'Healer',
  Tank = 'Tank'
}

export type SearchResult = {
  __typename?: 'SearchResult';
  name: Scalars['String']['output'];
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
};

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
  byBracket?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterLogsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', warcraftLogs?: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null, difficulty?: Difficulty | null, raidRankings?: Array<{ __typename?: 'RaidRanking', spec?: string | null, rankPercent?: number | null, medianPercent?: number | null, bestAmount?: number | null, totalKills?: number | null, encounter?: { __typename?: 'Encounter', id: number, name: string } | null }> | null } | null } | null };

export type CharacterSearchQueryVariables = Exact<{
  searchString: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSearchQuery = { __typename?: 'Query', characterSuggestions: Array<{ __typename?: 'SearchResult', name: string, realm: string, region: string }> };

export type CharacterSummaryQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSummaryQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, region: string, raiderIo?: { __typename?: 'RaiderIo', thumbnailUrl?: string | null, race?: string | null, class?: string | null, specialization?: string | null, itlvl?: number | null, bestMythicPlusRuns?: Array<{ __typename?: 'MythicPlusRun', dungeon: string, short_name: string, challange_mode_id: number, key_level: number, completed_at: string, icon_url: string, background_image_url: string, url: string, keystone_upgrades: number, role: string, spec?: { __typename?: 'MythicPlusSpec', name: string, slug: string } | null, class?: { __typename?: 'MythicPlusClass', name: string, slug: string } | null }> | null, recentMythicPlusRuns?: Array<{ __typename?: 'MythicPlusRun', dungeon: string, short_name: string, challange_mode_id: number, key_level: number, completed_at: string, icon_url: string, background_image_url: string, url: string, keystone_upgrades: number, role: string, spec?: { __typename?: 'MythicPlusSpec', name: string, slug: string } | null, class?: { __typename?: 'MythicPlusClass', name: string, slug: string } | null }> | null, raidProgression?: Array<{ __typename?: 'RaidProgressionDetail', raid: string, total_bosses?: number | null, heroic_bosses_killed?: number | null, mythic_bosses_killed?: number | null, normal_bosses_killed?: number | null }> | null, all?: { __typename?: 'Segment', score: number, color: string } | null, dps?: { __typename?: 'Segment', score: number, color: string } | null, healer?: { __typename?: 'Segment', score: number, color: string } | null, tank?: { __typename?: 'Segment', score: number, color: string } | null } | null } | null };

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
    query CharacterLogs($name: String!, $realm: String!, $region: String!, $role: RoleType, $metric: Metric, $difficulty: Difficulty, $byBracket: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    role: $role
    metric: $metric
    difficulty: $difficulty
    byBracket: $byBracket
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
export const CharacterSearchDocument = new TypedDocumentString(`
    query CharacterSearch($searchString: String!, $region: String!) {
  characterSuggestions(searchString: $searchString, region: $region) {
    name
    realm
    region
  }
}
    `) as unknown as TypedDocumentString<CharacterSearchQuery, CharacterSearchQueryVariables>;
export const CharacterSummaryDocument = new TypedDocumentString(`
    query CharacterSummary($name: String!, $realm: String!, $region: String!) {
  character(name: $name, realm: $realm, region: $region) {
    name
    realm
    region
    raiderIo {
      thumbnailUrl
      race
      class
      specialization
      itlvl
      bestMythicPlusRuns {
        dungeon
        short_name
        challange_mode_id
        key_level
        completed_at
        icon_url
        background_image_url
        url
        keystone_upgrades
        role
        spec {
          name
          slug
        }
        class {
          name
          slug
        }
      }
      recentMythicPlusRuns {
        dungeon
        short_name
        challange_mode_id
        key_level
        completed_at
        icon_url
        background_image_url
        url
        keystone_upgrades
        role
        spec {
          name
          slug
        }
        class {
          name
          slug
        }
      }
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
      dps {
        score
        color
      }
      healer {
        score
        color
      }
      tank {
        score
        color
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CharacterSummaryQuery, CharacterSummaryQueryVariables>;