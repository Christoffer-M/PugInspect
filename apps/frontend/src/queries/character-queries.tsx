import { CharacterQuery, CharacterQueryVariables } from "../graphql/graphql";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";

export const CharacterDataQuery = graphql(`
  query Character($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      logs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric
        raidRankings {
          encounter {
            id
            name
          }
          rankPercent
          medianPercent
          bestAmount
          totalKills
        }
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
      }
    }
  }
`);

export const useCharacterQuery = ({
  name,
  realm,
  region,
}: CharacterQueryVariables) => {
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
      const response = await execute<CharacterQuery, CharacterQueryVariables>(
        CharacterDataQuery,
        {
          name,
          realm,
          region,
        },
      );

      return response.character;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
