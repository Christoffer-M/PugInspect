import { gql } from "graphql-tag";

export const CHARACTER_PROFILE_QUERY = gql`
  query CharacterProfile(
    $name: String!
    $server: String!
    $region: String!
    $zoneID: Int!
    $difficulty: Int!
  ) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        zoneRankings(zoneID: $zoneID, difficulty: $difficulty)
        name
        hidden
      }
    }
    rateLimitData {
      limitPerHour
      pointsSpentThisHour
      pointsResetIn
    }
  }
`;
