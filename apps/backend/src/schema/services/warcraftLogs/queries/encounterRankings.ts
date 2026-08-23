import { gql } from "graphql-tag";
import { DocumentNode } from "graphql";

/**
 * One page of one spec's dungeon rankings, damage metric.
 *
 * Filtering per spec (not per class, not unfiltered) is deliberate: rankings
 * are score-sorted, so any broader filter samples each spec only as deeply as
 * it appears in the *filter population's* fastest runs — a spec that is rare
 * within its class contributes only its elite tail and its median inflates.
 * A per-spec query gives every spec the same sample depth.
 */
export const ENCOUNTER_RANKINGS_DPS: DocumentNode = gql`
  query EncounterRankingsDps($encounterID: Int!, $page: Int!, $className: String!, $specName: String!) {
    worldData {
      encounter(id: $encounterID) {
        dps: characterRankings(difficulty: 10, metric: dps, bracket: 0, page: $page, className: $className, specName: $specName)
      }
    }
  }
`;

/** Same, healing metric — healer specs are ranked on hps and need nothing else. */
export const ENCOUNTER_RANKINGS_HPS: DocumentNode = gql`
  query EncounterRankingsHps($encounterID: Int!, $page: Int!, $className: String!, $specName: String!) {
    worldData {
      encounter(id: $encounterID) {
        hps: characterRankings(difficulty: 10, metric: hps, bracket: 0, page: $page, className: $className, specName: $specName)
      }
    }
  }
`;

/** Dungeon list + keystone bracket range for a Mythic+ season zone. */
export const MYTHIC_PLUS_ZONE: DocumentNode = gql`
  query MythicPlusZone($zoneID: Int!) {
    worldData {
      zone(id: $zoneID) {
        id
        name
        brackets {
          min
          max
          bucket
        }
        encounters {
          id
          name
        }
      }
    }
  }
`;

export const RATE_LIMIT: DocumentNode = gql`
  query WclRateLimit {
    rateLimitData {
      limitPerHour
      pointsSpentThisHour
      pointsResetIn
    }
  }
`;
