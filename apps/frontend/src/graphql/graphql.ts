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
  items: Array<GearItem>;
  tierSets: Array<TierSetSummary>;
};

export type GearItem = {
  __typename?: 'GearItem';
  /** Permanent enchant display text, null if unenchanted */
  enchant?: Maybe<Scalars['String']['output']>;
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


export type CharacterGearQuery = { __typename?: 'Query', character?: { __typename?: 'Character', gear?: { __typename?: 'Gear', items: Array<{ __typename?: 'GearItem', slot: string, slotName: string, itemId: number, name: string, quality: string, itemLevel: number, iconUrl?: string | null, enchant?: string | null, missingEnchant: boolean, tierSetId?: number | null, tierSetName?: string | null, sockets: Array<{ __typename?: 'GearSocket', filled: boolean, display?: string | null }> }>, tierSets: Array<{ __typename?: 'TierSetSummary', id: number, name: string, equippedCount: number }> } | null } | null };

export type CharacterInfoQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterInfoQuery = { __typename?: 'Query', character?: { __typename?: 'Character', name: string, realm: string, region: string, class?: string | null, race?: string | null, activeSpec?: string | null, faction?: string | null, gender?: string | null, level?: number | null, equippedItemLevel?: number | null, averageItemLevel?: number | null, achievementPoints?: number | null, avatarUrl?: string | null, guild?: { __typename?: 'Guild', name: string, realm: string } | null, potentialAlts: Array<{ __typename?: 'AltCharacter', name: string, realm: string, region: string, class?: string | null, avatarUrl?: string | null, itemLevel?: number | null, mythicPlusScore?: number | null, mythicPlusColor?: string | null, raidProgression?: Array<{ __typename?: 'RaidProgressionDetail', raid: string, summary?: string | null, total_bosses?: number | null, normal_bosses_killed?: number | null, heroic_bosses_killed?: number | null, mythic_bosses_killed?: number | null }> | null }> } | null };

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

export type CharacterRaiderIoQueryVariables = Exact<{
  name: Scalars['String']['input'];
  realm: Scalars['String']['input'];
  region: Scalars['String']['input'];
  bypassCache?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CharacterRaiderIoQuery = { __typename?: 'Query', character?: { __typename?: 'Character', raiderIo?: { __typename?: 'RaiderIo', bestMythicPlusRuns?: Array<{ __typename?: 'MythicPlusRun', dungeon: string, short_name: string, challange_mode_id: number, key_level: number, completed_at: string, icon_url: string, background_image_url: string, url: string, keystone_upgrades: number, role: string, spec?: { __typename?: 'MythicPlusSpec', name: string, slug: string } | null, class?: { __typename?: 'MythicPlusClass', name: string, slug: string } | null }> | null, recentMythicPlusRuns?: Array<{ __typename?: 'MythicPlusRun', dungeon: string, short_name: string, challange_mode_id: number, key_level: number, completed_at: string, icon_url: string, background_image_url: string, url: string, keystone_upgrades: number, role: string, spec?: { __typename?: 'MythicPlusSpec', name: string, slug: string } | null, class?: { __typename?: 'MythicPlusClass', name: string, slug: string } | null }> | null, raidProgression?: Array<{ __typename?: 'RaidProgressionDetail', raid: string, total_bosses?: number | null, heroic_bosses_killed?: number | null, mythic_bosses_killed?: number | null, normal_bosses_killed?: number | null, expansion_id?: number | null }> | null, currentSeason?: { __typename?: 'SeasonScores', season?: string | null, all?: { __typename?: 'Segment', score: number, color: string } | null, dps?: { __typename?: 'Segment', score: number, color: string } | null, healer?: { __typename?: 'Segment', score: number, color: string } | null, tank?: { __typename?: 'Segment', score: number, color: string } | null } | null, previousSeason?: { __typename?: 'SeasonScores', season?: string | null, all?: { __typename?: 'Segment', score: number, color: string } | null, dps?: { __typename?: 'Segment', score: number, color: string } | null, healer?: { __typename?: 'Segment', score: number, color: string } | null, tank?: { __typename?: 'Segment', score: number, color: string } | null } | null } | null } | null };

export type CharacterSearchQueryVariables = Exact<{
  searchString: Scalars['String']['input'];
  region: Scalars['String']['input'];
}>;


export type CharacterSearchQuery = { __typename?: 'Query', characterSuggestions: Array<{ __typename?: 'SearchResult', name: string, realm: string, region: string }> };

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
      items {
        slot
        slotName
        itemId
        name
        quality
        itemLevel
        iconUrl
        enchant
        missingEnchant
        sockets {
          filled
          display
        }
        tierSetId
        tierSetName
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
      mythicPlusScore
      mythicPlusColor
      raidProgression {
        raid
        summary
        total_bosses
        normal_bosses_killed
        heroic_bosses_killed
        mythic_bosses_killed
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
export const CharacterRaiderIoDocument = new TypedDocumentString(`
    query CharacterRaiderIo($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
  character(
    name: $name
    realm: $realm
    region: $region
    bypassCache: $bypassCache
  ) {
    raiderIo {
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
        expansion_id
      }
      currentSeason {
        season
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
      previousSeason {
        season
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
}
    `) as unknown as TypedDocumentString<CharacterRaiderIoQuery, CharacterRaiderIoQueryVariables>;
export const CharacterSearchDocument = new TypedDocumentString(`
    query CharacterSearch($searchString: String!, $region: String!) {
  characterSuggestions(searchString: $searchString, region: $region) {
    name
    realm
    region
  }
}
    `) as unknown as TypedDocumentString<CharacterSearchQuery, CharacterSearchQueryVariables>;
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