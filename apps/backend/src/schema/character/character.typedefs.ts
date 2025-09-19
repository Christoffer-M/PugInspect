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
    raiderIoScore: Int
    warcraftLogsName: String
  }
`;
