import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import { CharacterGearQuery, CharacterGearQueryVariables } from "../graphql/graphql";

/** Exactly what this query selects — narrower than the schema's Gear type, so
    dropping a field from the document is a compile error at every consumer. */
export type CharacterGear = NonNullable<
  NonNullable<CharacterGearQuery["character"]>["gear"]
>;
export type CharacterGearItem = CharacterGear["items"][number];

export const CharacterGearQueryDoc = graphql(`
  query CharacterGear($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      gear {
        equippedItemLevel
        items {
          slot
          itemId
          name
          quality
          itemLevel
          iconUrl
          enchantId
          bonusIds
          missingEnchant
          sockets {
            filled
            itemId
          }
          tierSetId
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
    queryFn: async (): Promise<CharacterGear | undefined | null> => {
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
