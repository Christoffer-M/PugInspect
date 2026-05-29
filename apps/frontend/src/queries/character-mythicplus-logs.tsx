import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CharacterMythicPlusLogsQuery,
  CharacterMythicPlusLogsQueryVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

export type CharacterMythicPlusLogs = NonNullable<
  CharacterMythicPlusLogsQuery["character"]
>["mythicPlusLogs"];

const query = graphql(`
  query CharacterMythicPlusLogs(
    $name: String!
    $realm: String!
    $region: String!
    $metric: Metric
    $zoneId: Int
    $partition: Int
    $bypassCache: Boolean
  ) {
    character(
      name: $name
      realm: $realm
      region: $region
      metric: $metric
      zoneId: $zoneId
      partition: $partition
      bypassCache: $bypassCache
    ) {
      mythicPlusLogs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric

        dungeonRankings {
          spec
          dungeon {
            id
            name
          }
          rankPercent
          medianPercent
          bestScore
          throughputPercent
          medianThroughputPercent
          bestThroughput
          bestLevel
          lowParses
          totalRuns
        }
      }
    }
  }
`);

export const useCharacterMythicPlusLogs = ({
  bypassCacheRef,
  enabled = true,
  ...args
}: Omit<CharacterMythicPlusLogsQueryVariables, "bypassCache" | "role"> & {
  bypassCacheRef?: RefObject<boolean>;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: queryKeys.characterMythicPlusLogs(args),
    enabled,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CharacterMythicPlusLogs> => {
      const response = await execute<
        CharacterMythicPlusLogsQuery,
        CharacterMythicPlusLogsQueryVariables
      >(query, { ...args, bypassCache: bypassCacheRef?.current ?? false });

      return response.character?.mythicPlusLogs;
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });
