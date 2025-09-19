import { gql } from 'graphql-tag';

export default gql`
  extend type Query {
    character(name: String!, realm: String!): Character
  }

  type Character {
    name: String!
    realm: String!
    raiderIoScore: Int
    gear: Gear
    logs: [Log!]!
  }

  type Gear {
    ilvl: Int
    items: [Item!]!
  }

  type Item {
    slot: String!
    name: String!
  }

  type Log {
    boss: String!
    dps: Int
    percentile: Float
  }
`;
