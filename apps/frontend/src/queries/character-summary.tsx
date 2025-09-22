import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  CharacterSummaryQuery,
  CharacterSummaryQueryVariables,
} from "../graphql/graphql";

export const CharacterDataQuery = graphql(`
  query CharacterSummary($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      logs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric
      }
      name
      realm
      region
      thumbnailUrl
      raiderIoScore {
        all {
          score
          color
        }
        dps {
          score
          color
        }
        healer {
          score
          color
        }
        tank {
          score
          color
        }
      }
    }
  }
`);

export const useCharacterSummaryQuery = ({
  name,
  realm,
  region,
}: CharacterSummaryQueryVariables) => {
  const lowerCasedName = name.toLowerCase();
  const lowerCasedRealm = realm.toLowerCase();
  const upperCasedRegion = region.toUpperCase();
  return useQuery({
    queryKey: queryKeys.character(
      lowerCasedName,
      lowerCasedRealm,
      upperCasedRegion,
    ),
    retry: false,
    queryFn: async () => {
      const response = await execute<
        CharacterSummaryQuery,
        CharacterSummaryQueryVariables
      >(CharacterDataQuery, {
        name,
        realm,
        region,
      });

      return response.character;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
