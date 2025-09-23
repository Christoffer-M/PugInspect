import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterLogsQuery,
  CharacterLogsQueryVariables,
  Difficulty,
  Metric,
  RoleType,
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
  ) {
    character(
      name: $name
      realm: $realm
      region: $region
      role: $role
      metric: $metric
      difficulty: $difficulty
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

export const useCharacterLogs = ({
  name,
  realm,
  region,
  role,
  metric,
  difficulty,
}: CharacterLogsQueryVariables) =>
  useQuery({
    queryKey: queryKeys.characterLogs(
      name,
      realm,
      region,
      role as RoleType | undefined,
      metric as Metric | undefined,
      difficulty as Difficulty | undefined,
    ),
    retry: false,
    queryFn: async (): Promise<CharacterLogsWarcraftLogs> => {
      const response = await execute<
        CharacterLogsQuery,
        CharacterLogsQueryVariables
      >(query, {
        name,
        realm,
        region,
        role,
        metric,
        difficulty,
      });

      return response.character?.warcraftLogs;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
