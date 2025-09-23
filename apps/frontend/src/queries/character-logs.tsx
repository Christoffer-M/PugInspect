import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterLogsQuery,
  CharacterLogsQueryVariables,
  Metric,
  RoleType,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

const query = graphql(`
  query CharacterLogs(
    $name: String!
    $realm: String!
    $region: String!
    $role: RoleType
    $metric: Metric
  ) {
    character(
      name: $name
      realm: $realm
      region: $region
      role: $role
      metric: $metric
    ) {
      warcraftLogs {
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
  metric,
}: CharacterLogsQueryVariables) =>
  useQuery({
    queryKey: queryKeys.characterLogs(
      name,
      realm,
      region,
      role as RoleType | undefined,
      metric as Metric | undefined,
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
        metric,
      });

      return response.character?.warcraftLogs;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
