import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterRaidLogsQuery,
  CharacterRaidLogsQueryVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

export type CharacterRaidLogs = NonNullable<
  CharacterRaidLogsQuery["character"]
>["raidLogs"];

const query = graphql(`
  query CharacterRaidLogs(
    $name: String!
    $realm: String!
    $region: String!
    $role: RoleType
    $metric: Metric
    $difficulty: Difficulty
    $byBracket: Boolean
    $zoneId: Int
    $partition: Int
    $bypassCache: Boolean
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
      partition: $partition
      bypassCache: $bypassCache
    ) {
      raidLogs {
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
          bestRank {
            ilvl
          }
        }
      }
    }
  }
`);

export const useCharacterRaidLogs = ({
  bypassCacheRef,
  enabled = true,
  ...args
}: Omit<CharacterRaidLogsQueryVariables, "bypassCache"> & {
  bypassCacheRef?: RefObject<boolean>;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: queryKeys.characterRaidLogs(args),
    enabled,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CharacterRaidLogs> => {
      const response = await execute<
        CharacterRaidLogsQuery,
        CharacterRaidLogsQueryVariables
      >(query, { ...args, bypassCache: bypassCacheRef?.current ?? false });

      return response.character?.raidLogs;
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });
