import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  CharacterGearQuery,
  CharacterGearQueryVariables,
  Gear,
} from "../graphql/graphql";

export const CharacterGearQueryDoc = graphql(`
  query CharacterGear($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      gear {
        items {
          slot
          slotName
          itemId
          name
          quality
          itemLevel
          iconUrl
          enchant
          missingEnchant
          sockets {
            filled
            display
          }
          tierSetId
          tierSetName
        }
        tierSets {
          id
          name
          equippedCount
        }
      }
    }
  }
`);

export const useCharacterGearQuery = ({
  name,
  realm,
  region,
  bypassCacheRef,
}: Pick<CharacterGearQueryVariables, "name" | "realm" | "region"> & {
  bypassCacheRef?: RefObject<boolean>;
}) =>
  useQuery({
    queryKey: queryKeys.characterGear(name, realm, region),
    retry: false,
    queryFn: async (): Promise<Gear | undefined | null> => {
      const response = await execute<CharacterGearQuery, CharacterGearQueryVariables>(
        CharacterGearQueryDoc,
        {
          name,
          realm,
          region,
          bypassCache: bypassCacheRef?.current ?? false,
        },
      );
      return response.character?.gear;
    },
    gcTime: 1000 * 60 * 60, // 1 hour — matches equipment server-side cache
    staleTime: 1000 * 60 * 60,
  });
