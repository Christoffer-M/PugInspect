import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  CharacterProgressionQuery,
  CharacterProgressionQueryVariables,
  CharacterRecentRunsQuery,
  CharacterRecentRunsQueryVariables,
} from "../graphql/graphql";

type Args = Pick<CharacterProgressionQueryVariables, "name" | "realm" | "region"> & {
  bypassCacheRef?: RefObject<boolean>;
};

// Progression comes from Blizzard (fast); recent runs are the one thing still
// fetched from Raider.IO (~1s cold). Separate documents so the header and
// tables never wait on Raider.IO.
export const CharacterProgressionQueryDoc = graphql(`
  query CharacterProgression($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      mythicPlus {
        currentSeason {
          season
          rating
          color
          bestRuns { dungeonId dungeon keyLevel completedAt upgrades spec url }
        }
        previousSeason {
          season
          rating
          color
          bestRuns { dungeonId dungeon keyLevel completedAt upgrades spec url }
        }
      }
      raidProgression { raid normal heroic mythic }
    }
  }
`);

export const useCharacterProgressionQuery = ({ name, realm, region, bypassCacheRef }: Args) =>
  useQuery({
    queryKey: queryKeys.characterProgression(name, realm, region),
    retry: false,
    queryFn: async () => {
      const response = await execute<CharacterProgressionQuery, CharacterProgressionQueryVariables>(
        CharacterProgressionQueryDoc,
        { name, realm, region, bypassCache: bypassCacheRef?.current ?? false },
      );
      return response.character;
    },
    gcTime: 1000 * 60 * 15, // 15 minutes — matches the server-side cache
    staleTime: 1000 * 60 * 15,
  });

export const CharacterRecentRunsQueryDoc = graphql(`
  query CharacterRecentRuns($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      recentMythicPlusRuns { dungeonId dungeon keyLevel completedAt upgrades spec url }
    }
  }
`);

export const useCharacterRecentRunsQuery = ({ name, realm, region, bypassCacheRef }: Args) =>
  useQuery({
    queryKey: queryKeys.characterRecentRuns(name, realm, region),
    retry: false,
    queryFn: async () => {
      const response = await execute<CharacterRecentRunsQuery, CharacterRecentRunsQueryVariables>(
        CharacterRecentRunsQueryDoc,
        { name, realm, region, bypassCache: bypassCacheRef?.current ?? false },
      );
      return response.character?.recentMythicPlusRuns ?? [];
    },
    gcTime: 1000 * 60 * 15, // 15 minutes — matches the server-side cache
    staleTime: 1000 * 60 * 15,
  });
