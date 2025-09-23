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
    ): Character
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
    warcraftLogs(role: RoleType, metric: Metric): Logs
  }

  type RaiderIo {
    thumbnailUrl: String
    race: String
    all: Segment
    dps: Segment
    healer: Segment
    tank: Segment
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
  }

  type Encounter {
    id: Int!
    name: String!
  }
`;
