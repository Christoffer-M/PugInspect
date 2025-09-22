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
  logs?: Maybe<Logs>;
  name: Scalars['String']['output'];
  raiderIoScore?: Maybe<RioScore>;
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};


export type CharacterLogsArgs = {
  role?: InputMaybe<RoleType>;
};

export type Encounter = {
  __typename?: 'Encounter';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type Logs = {
  __typename?: 'Logs';
  bestPerformanceAverage?: Maybe<Scalars['Float']['output']>;
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

export type RioScore = {
  __typename?: 'RioScore';
  all?: Maybe<Segment>;
  dps?: Maybe<Segment>;
  healer?: Maybe<Segment>;
  tank?: Maybe<Segment>;
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
  role: RoleType;
}>;


export type CharacterLogsQuery = { __typename?: 'Query', character?: { __typename?: 'Character', logs?: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null, raidRankings?: Array<{ __typename?: 'RaidRanking', rankPercent?: number | null, medianPercent?: number | null, bestAmount?: number | null, totalKills?: number | null, encounter?: { __typename?: 'Encounter', id: number, name: string } | null }> | null } | null } | null };

export type CharacterSummaryQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSummaryQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, region: string, thumbnailUrl?: string | null, logs?: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, metric?: Metric | null } | null, raiderIoScore?: { __typename?: 'RioScore', all?: { __typename?: 'Segment', score: number, color: string } | null, dps?: { __typename?: 'Segment', score: number, color: string } | null, healer?: { __typename?: 'Segment', score: number, color: string } | null, tank?: { __typename?: 'Segment', score: number, color: string } | null } | null } | null };

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
    query CharacterLogs($name: String!, $realm: String!, $region: String!, $role: RoleType!) {
  character(name: $name, realm: $realm, region: $region, role: $role) {
    logs {
      bestPerformanceAverage
      medianPerformanceAverage
      metric
      raidRankings {
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
    logs {
      bestPerformanceAverage
      medianPerformanceAverage
      metric
    }
    name
    realm
    region
    thumbnailUrl
    raiderIoScore {
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