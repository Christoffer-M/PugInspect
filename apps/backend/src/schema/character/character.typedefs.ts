import { gql } from "graphql-tag";

export const characterTypedefs = gql`
  type Query {
    character(
      name: String!
      realm: String!
      region: String!
      role: RoleType
      metric: Metric
      difficulty: Difficulty
      byBracket: Boolean
      zoneId: Int
      partition: Int
      bypassCache: Boolean
    ): Character
    characterSuggestions(
      region: String!
      searchString: String!
    ): [SearchResult!]!
    zonePartitions(zoneId: Int!): [ZonePartition!]!
    siteStats: SiteStats!
  }

  type SiteStats {
    totalCharacters: Int!
    newCharactersThisWeek: Int!
    realmsTracked: Int!
    searchesToday: Int!
    searchesYesterday: Int!
    searchesPerDay: [DailySearchCount!]!
    regionBreakdown: [RegionCount!]!
    classDistribution: [ClassCount!]!
    recentSearches: [RecentSearch!]!
    trendingCharacters: [TrendingCharacter!]!
  }

  type DailySearchCount {
    date: String!
    count: Int!
  }

  type RegionCount {
    region: String!
    count: Int!
  }

  type ClassCount {
    class: String!
    count: Int!
  }

  type RecentSearch {
    name: String!
    realm: String!
    region: String!
    class: String
    specialization: String
    searchedAt: String!
  }

  type TrendingCharacter {
    name: String!
    realm: String!
    region: String!
    class: String
    searches: Int!
  }

  type ZonePartition {
    id: Int!
    name: String!
    compactName: String!
    isDefault: Boolean!
  }

  type SearchResult {
    name: String!
    realm: String!
    region: String!
  }

  enum Difficulty {
    LFR
    Normal
    Heroic
    Mythic
  }

  enum RoleType {
    Any
    DPS
    Healer
    Tank
  }

  type Character {
    name: String!
    realm: String!
    region: String!
    class: String
    race: String
    activeSpec: String
    faction: String
    gender: String
    level: Int
    equippedItemLevel: Float
    averageItemLevel: Float
    achievementPoints: Int
    guild: Guild
    avatarUrl: String
    raiderIo: RaiderIo
    raidLogs(role: RoleType, metric: Metric, byBracket: Boolean): RaidLogs
    mythicPlusLogs(role: RoleType, metric: Metric): MythicPlusLogs
    potentialAlts: [AltCharacter!]!
    gear: Gear
  }

  type Gear {
    items: [GearItem!]!
    tierSets: [TierSetSummary!]!
  }

  type GearItem {
    "Canonical slot token, e.g. HEAD — stable key, defines display order"
    slot: String!
    "Localized slot name, e.g. Head"
    slotName: String!
    "Blizzard item id — e.g. for wowhead.com/item=<id> links"
    itemId: Int!
    name: String!
    "POOR|COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|ARTIFACT|HEIRLOOM"
    quality: String!
    itemLevel: Int!
    iconUrl: String
    "Permanent enchant display text, null if unenchanted"
    enchant: String
    "True when the slot is enchantable this season but has no permanent enchant"
    missingEnchant: Boolean!
    sockets: [GearSocket!]!
    tierSetId: Int
    tierSetName: String
  }

  type GearSocket {
    filled: Boolean!
    "Gem display text (e.g. +176 Haste) or gem name; null when empty"
    display: String
  }

  type TierSetSummary {
    id: Int!
    name: String!
    equippedCount: Int!
  }

  type AltCharacter {
    name: String!
    realm: String!
    region: String!
    class: String
    avatarUrl: String
    itemLevel: Float
    mythicPlusScore: Float
    mythicPlusColor: String
    raidProgression: [RaidProgressionDetail!]
  }

  type Guild {
    name: String!
    realm: String!
  }

  type RaiderIo {
    raidProgression: [RaidProgressionDetail!]
    bestMythicPlusRuns: [MythicPlusRun!]
    recentMythicPlusRuns: [MythicPlusRun!]
    currentSeason: SeasonScores
    previousSeason: SeasonScores
  }
  
  type SeasonScores {
    season: String
    all: Segment
    dps: Segment
    healer: Segment
    tank: Segment
  }
  type MythicPlusRun {
    dungeon: String!
    short_name: String!
    challange_mode_id: Int!
    key_level: Int!
    completed_at: String!
    icon_url: String!
    background_image_url: String!
    url: String!
    keystone_upgrades: Int!
    role: String!
    spec: MythicPlusSpec
    class: MythicPlusClass
  }

  type MythicPlusSpec {
    name: String!
    slug: String!
  }
  type MythicPlusClass {
    name: String!
    slug: String!
  }

  type RaidProgressionDetail {
    raid: String!
    summary: String
    expansion_id: Int
    total_bosses: Int
    normal_bosses_killed: Int
    heroic_bosses_killed: Int
    mythic_bosses_killed: Int
  }

  type Segment {
    score: Float!
    color: String!
  }

  interface ZoneLogs {
    bestPerformanceAverage: Float
    medianPerformanceAverage: Float
    metric: Metric
  }

  type RaidLogs implements ZoneLogs {
    bestPerformanceAverage: Float
    medianPerformanceAverage: Float
    metric: Metric
    difficulty: Difficulty
    raidRankings: [RaidRanking!]
  }

  type MythicPlusLogs implements ZoneLogs {
    bestPerformanceAverage: Float
    medianPerformanceAverage: Float
    metric: Metric
    dungeonRankings: [MythicPlusRanking!]
  }

  type MythicPlusRanking {
    dungeon: Encounter
    rankPercent: Float
    medianPercent: Float
    bestScore: Float
    throughputPercent: Float
    medianThroughputPercent: Float
    bestThroughput: Float
    bestLevel: Int
    lowParses: Boolean
    totalRuns: Int
    spec: String
  }

  enum Metric {
    dps
    hps
    points_and_damage
    points_and_healing
  }

  type BestRank {
    ilvl: Int
  }

  type RaidRanking {
    encounter: Encounter
    rankPercent: Float
    medianPercent: Float
    bestAmount: Float
    totalKills: Int
    spec: String
    bestRank: BestRank
  }

  type Encounter {
    id: Int!
    name: String!
  }
`;
