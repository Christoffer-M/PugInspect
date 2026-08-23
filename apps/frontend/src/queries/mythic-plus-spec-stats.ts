import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import type {
  MythicPlusSpecStatsQuery,
  MythicPlusSpecStatsQueryVariables,
} from "../graphql/graphql";

const query = graphql(`
  query MythicPlusSpecStats($zoneId: Int, $keyFloor: Int) {
    mythicPlusSpecStats(zoneId: $zoneId, keyFloor: $keyFloor) {
      zoneId
      refreshedAt
      keyFloor
      keyLevels
      totalParses
      minParsesToRank
      sampleDepth
      minKeyLevel
      dungeons {
        encounterId
        name
      }
      specs {
        classSlug
        specSlug
        className
        specName
        role
        metric
        parses
        median
        p95
        max
        medianKey
        maxKey
        dungeons {
          encounterId
          parses
          median
          p95
          max
          medianKey
          maxKey
        }
      }
    }
  }
`);

export type MythicPlusSpecStats = NonNullable<MythicPlusSpecStatsQuery["mythicPlusSpecStats"]>;
export type SpecStat = MythicPlusSpecStats["specs"][number];
export type SpecDungeonStat = SpecStat["dungeons"][number];

export const useMythicPlusSpecStats = (zoneId?: number, keyFloor?: number) =>
  useQuery({
    queryKey: ["mythicPlusSpecStats", zoneId ?? null, keyFloor ?? null],
    // The crawler rebuilds hourly; nothing changes in between.
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<MythicPlusSpecStats | null> => {
      const response = await execute<MythicPlusSpecStatsQuery, MythicPlusSpecStatsQueryVariables>(
        query,
        { zoneId, keyFloor }
      );
      return response.mythicPlusSpecStats ?? null;
    },
  });
