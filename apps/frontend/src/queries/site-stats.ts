import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import { SiteStatsQuery } from "../graphql/graphql";

const query = graphql(`
  query SiteStats {
    siteStats {
      totalCharacters
      newCharactersThisWeek
      realmsTracked
      searchesToday
      searchesYesterday
      searchesPerDay {
        date
        count
      }
      regionBreakdown {
        region
        count
      }
      classDistribution {
        class
        count
      }
      recentSearches {
        name
        realm
        region
        class
        specialization
        searchedAt
      }
      trendingCharacters {
        name
        realm
        region
        class
        searches
      }
    }
  }
`);

export type SiteStats = SiteStatsQuery["siteStats"];

export const useSiteStats = () =>
  useQuery({
    queryKey: ["siteStats"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<SiteStats> => {
      const response = await execute<SiteStatsQuery, Record<string, never>>(query);
      return response.siteStats;
    },
  });
