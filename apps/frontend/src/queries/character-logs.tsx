import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterLogsQuery,
  CharacterLogsQueryVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

export type CharacterLogsWarcraftLogs = NonNullable<
  CharacterLogsQuery["character"]
>["warcraftLogs"];

const query = graphql(`
  query CharacterLogs(
    $name: String!
    $realm: String!
    $region: String!
    $role: RoleType
    $metric: Metric
    $difficulty: Difficulty
    $byBracket: Boolean
    $zoneId: Int
  ) {
    character(
      name: $name
      realm: $realm
      region: $region
      role: $role
      metric: $metric
      difficulty: $difficulty
      byBracket: $byBracket
      zoneId: $zoneId
    ) {
      warcraftLogs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric
        difficulty
        raidRankings {
          spec
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

export const useCharacterLogs = (args: CharacterLogsQueryVariables) =>
  useQuery({
    queryKey: queryKeys.characterLogs(args),
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CharacterLogsWarcraftLogs> => {
      const response = await execute<
        CharacterLogsQuery,
        CharacterLogsQueryVariables
      >(query, args);

      return response.character?.warcraftLogs;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
