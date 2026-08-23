import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import type {
  MythicPlusSpecStatsQuery,
  MythicPlusSpecStatsQueryVariables,
} from "../graphql/graphql";

const query = graphql(`
  query MythicPlusSpecStats($zoneId: Int) {
    mythicPlusSpecStats(zoneId: $zoneId) {
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
          maxReportUrl
        }
      }
    }
  }
`);

export type MythicPlusSpecStats = NonNullable<MythicPlusSpecStatsQuery["mythicPlusSpecStats"]>;
export type SpecStat = MythicPlusSpecStats["specs"][number];
export type SpecDungeonStat = SpecStat["dungeons"][number];

export const useMythicPlusSpecStats = (zoneId?: number) =>
  useQuery({
    queryKey: ["mythicPlusSpecStats", zoneId ?? null],
    // The crawler rebuilds hourly; nothing changes in between.
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<MythicPlusSpecStats | null> => {
      const response = await execute<MythicPlusSpecStatsQuery, MythicPlusSpecStatsQueryVariables>(
        query,
        { zoneId }
      );
      return response.mythicPlusSpecStats ?? null;
    },
  });
