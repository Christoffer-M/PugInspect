import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import { CharacterInfoQuery, CharacterInfoQueryVariables } from "../graphql/graphql";

/** The character as this query selects it — not the full schema type. */
export type CharacterInfo = NonNullable<CharacterInfoQuery["character"]>;
export type AltInfo = CharacterInfo["potentialAlts"][number];

export const CharacterInfoQueryDoc = graphql(`
  query CharacterInfo($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      name
      realm
      realmSlug
      region
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
      potentialAlts {
        name
        realm
        region
        class
        avatarUrl
        itemLevel
        mythicPlus {
          currentSeason { rating color }
        }
        raidProgression { raid normal heroic mythic }
      }
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
    queryFn: async (): Promise<CharacterInfo | undefined | null> => {
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
