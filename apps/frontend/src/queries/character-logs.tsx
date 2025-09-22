import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterLogsQuery,
  CharacterLogsQueryVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

const query = graphql(`
  query CharacterLogs(
    $name: String!
    $realm: String!
    $region: String!
    $role: RoleType!
  ) {
    character(name: $name, realm: $realm, region: $region, role: $role) {
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
    }
  }
`);

export const useCharacterLogs = ({
  name,
  realm,
  region,
  role,
}: CharacterLogsQueryVariables) => {
  const lowerCasedName = name.toLowerCase();
  const lowerCasedRealm = realm.toLowerCase();
  const upperCasedRegion = region.toUpperCase();
  return useQuery({
    queryKey: queryKeys.characterLogs(
      lowerCasedName,
      lowerCasedRealm,
      upperCasedRegion,
      role,
    ),
    retry: false,
    queryFn: async () => {
      const response = await execute<
        CharacterLogsQuery,
        CharacterLogsQueryVariables
      >(query, {
        name,
        realm,
        region,
        role,
      });

      return response.character;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
