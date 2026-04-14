import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  Character,
  CharacterInfoQuery,
  CharacterInfoQueryVariables,
} from "../graphql/graphql";

export const CharacterInfoQueryDoc = graphql(`
  query CharacterInfo($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      name
      realm
      region
      fetchedAt
      class
      race
      activeSpec
      faction
      gender
      level
      equippedItemLevel
      averageItemLevel
      achievementPoints
      guild {
        name
        realm
      }
      avatarUrl
    }
  }
`);

export const useCharacterInfoQuery = ({
  name,
  realm,
  region,
  bypassCacheRef,
}: Pick<CharacterInfoQueryVariables, "name" | "realm" | "region"> & {
  bypassCacheRef?: RefObject<boolean>;
}) =>
  useQuery({
    queryKey: queryKeys.character(name, realm, region),
    retry: false,
    queryFn: async (): Promise<Character | undefined | null> => {
      const response = await execute<CharacterInfoQuery, CharacterInfoQueryVariables>(
        CharacterInfoQueryDoc,
        {
          name,
          realm,
          region,
          bypassCache: bypassCacheRef?.current ?? false,
        },
      );
      return response.character;
    },
    gcTime: 1000 * 60 * 60 * 24, // 24 hours — matches Blizzard server-side cache
    staleTime: 1000 * 60 * 60 * 24,
  });
