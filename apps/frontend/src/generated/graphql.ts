/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  logs: Logs;
  name: Scalars['String']['output'];
  raiderIoScore?: Maybe<RioScore>;
  realm: Scalars['String']['output'];
  region: Scalars['String']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
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
  raidRankings?: Maybe<Array<RaidRanking>>;
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  character?: Maybe<Character>;
  characters: Array<Character>;
};


export type QueryCharacterArgs = {
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
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

export type Segment = {
  __typename?: 'Segment';
  color: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};

export type CharacterQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, region: string, thumbnailUrl?: string | null, logs: { __typename?: 'Logs', bestPerformanceAverage?: number | null, medianPerformanceAverage?: number | null, raidRankings?: Array<{ __typename?: 'RaidRanking', rankPercent?: number | null, medianPercent?: number | null, bestAmount?: number | null, totalKills?: number | null, encounter?: { __typename?: 'Encounter', id: number, name: string } | null }> | null }, raiderIoScore?: { __typename?: 'RioScore', all?: { __typename?: 'Segment', score: number, color: string } | null } | null } | null };


export const CharacterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Character"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"realm"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"region"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"character"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"realm"},"value":{"kind":"Variable","name":{"kind":"Name","value":"realm"}}},{"kind":"Argument","name":{"kind":"Name","value":"region"},"value":{"kind":"Variable","name":{"kind":"Name","value":"region"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bestPerformanceAverage"}},{"kind":"Field","name":{"kind":"Name","value":"medianPerformanceAverage"}},{"kind":"Field","name":{"kind":"Name","value":"raidRankings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"encounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankPercent"}},{"kind":"Field","name":{"kind":"Name","value":"medianPercent"}},{"kind":"Field","name":{"kind":"Name","value":"bestAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalKills"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"realm"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"raiderIoScore"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"all"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CharacterQuery, CharacterQueryVariables>;