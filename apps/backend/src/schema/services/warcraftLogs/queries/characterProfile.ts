import { gql } from "graphql-tag";

export const CHARACTER_PROFILE = gql`
  query CharacterProfile(
    $name: String!
    $server: String!
    $region: String!
    $zoneID: Int!
    $difficulty: Int!
    $role: RoleType!
  ) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        zoneRankings(zoneID: $zoneID, difficulty: $difficulty, role: $role)
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
