import { gql } from "graphql-tag";
import { DocumentNode } from "graphql";

export const ZONE_PARTITIONS: DocumentNode = gql`
  query ZonePartitions($zoneID: Int!) {
    worldData {
      zone(id: $zoneID) {
        partitions {
          id
          name
          compactName
          default
        }
      }
    }
  }
`;
