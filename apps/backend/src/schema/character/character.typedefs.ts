import { gql } from "graphql-tag";

export const characterTypedefs = gql`
  extend type Query {
    character(name: String!, realm: String!, region: String!): Character
    characterLogs(
      name: String!
      realm: String!
      region: String!
      role: RoleType
    ): Logs
    characters: [Character!]!
  }

  enum RoleType {
    DPS
    Healer
    Tank
  }

  type Character {
    name: String!
    realm: String!
    region: String!
    thumbnailUrl: String
    raiderIoScore: RioScore
    logs: Logs!
  }

  type RioScore {
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
