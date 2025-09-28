import { gql } from "graphql-tag";

export const characterTypedefs = gql`
  extend type Query {
    character(
      name: String!
      realm: String!
      region: String!
      role: RoleType
      metric: Metric
      difficulty: Difficulty
      byBracket: Boolean
    ): Character
    characterSuggestions(
      region: String!
      searchString: String!
    ): [SearchResult!]!
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
    raiderIo: RaiderIo
    warcraftLogs(role: RoleType, metric: Metric, byBracket: Boolean): Logs
  }

  type RaiderIo {
    class: String
    itlvl: Float
    thumbnailUrl: String
    specialization: String
    raidProgression: [RaidProgressionDetail!]
    bestMythicPlusRuns: [MythicPlusRun!]
    recentMythicPlusRuns: [MythicPlusRun!]
    race: String
    gear: String
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

  type Logs {
    bestPerformanceAverage: Float
    medianPerformanceAverage: Float
    metric: Metric
    difficulty: Difficulty
    raidRankings: [RaidRanking!]
  }

  enum Metric {
    dps
    hps
  }

  type RaidRanking {
    encounter: Encounter
    rankPercent: Float
    medianPercent: Float
    bestAmount: Float
    totalKills: Int
    spec: String
  }

  type Encounter {
    id: Int!
    name: String!
  }
`;
