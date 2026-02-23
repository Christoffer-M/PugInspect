import { gql } from "graphql-tag";
import { DocumentNode } from "graphql";

export const CHARACTER_PROFILE: DocumentNode = gql`
  query CharacterProfile(
    $name: String!
    $server: String!
    $region: String!
    $zoneID: Int
    $difficulty: Int
    $role: RoleType
    $metric: CharacterPageRankingMetricType
    $byBracket: Boolean
  ) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        zoneRankings(
          zoneID: $zoneID
          difficulty: $difficulty
          role: $role
          metric: $metric
          byBracket: $byBracket
        )
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
