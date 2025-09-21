import { gql } from "graphql-tag";

export default gql`
  extend type Query {
    character(name: String!, realm: String!, region: String!): Character
    characters: [Character!]!
  }

  type Character {
    name: String!
    realm: String!
    region: String!
    thumbnailUrl: String
    raiderIoScore: RioScore
    logs: Logs
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
    bestPerformanceAverage: Float!
    medianPerformanceAverage: Float!
    raidRankings: [RaidRanking!]!
  }

  type RaidRanking {
    encounter: Encounter
    rankPercent: Float!
    medianPercent: Float!
    bestAmount: Float!
    totalKills: Int!
  }

  type Encounter {
    id: Int!
    name: String!
  }
`;
