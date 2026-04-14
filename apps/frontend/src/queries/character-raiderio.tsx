import { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  CharacterRaiderIoQuery,
  CharacterRaiderIoQueryVariables,
  RaiderIo,
} from "../graphql/graphql";

export const CharacterRaiderIoQueryDoc = graphql(`
  query CharacterRaiderIo($name: String!, $realm: String!, $region: String!, $bypassCache: Boolean) {
    character(name: $name, realm: $realm, region: $region, bypassCache: $bypassCache) {
      raiderIo {
        bestMythicPlusRuns {
          dungeon
          short_name
          challange_mode_id
          key_level
          completed_at
          icon_url
          background_image_url
          url
          keystone_upgrades
          role
          spec {
            name
            slug
          }
          class {
            name
            slug
          }
        }
        recentMythicPlusRuns {
          dungeon
          short_name
          challange_mode_id
          key_level
          completed_at
          icon_url
          background_image_url
          url
          keystone_upgrades
          role
          spec {
            name
            slug
          }
          class {
            name
            slug
          }
        }
        raidProgression {
          raid
          total_bosses
          heroic_bosses_killed
          mythic_bosses_killed
          normal_bosses_killed
          expansion_id
        }
        currentSeason {
          all { score color }
          dps { score color }
          healer { score color }
          tank { score color }
        }
        previousSeason {
          all { score color }
          dps { score color }
          healer { score color }
          tank { score color }
        }
      }
    }
  }
`);

export const useCharacterRaiderIoQuery = ({
  name,
  realm,
  region,
  bypassCacheRef,
}: Pick<CharacterRaiderIoQueryVariables, "name" | "realm" | "region"> & {
  bypassCacheRef?: RefObject<boolean>;
}) =>
  useQuery({
    queryKey: queryKeys.characterRaiderIo(name, realm, region),
    retry: false,
    queryFn: async (): Promise<RaiderIo | undefined | null> => {
      const response = await execute<
        CharacterRaiderIoQuery,
        CharacterRaiderIoQueryVariables
      >(CharacterRaiderIoQueryDoc, {
        name,
        realm,
        region,
        bypassCache: bypassCacheRef?.current ?? false,
      });
      return response.character?.raiderIo;
    },
    gcTime: 1000 * 60 * 15, // 15 minutes — matches RaiderIO server-side cache
    staleTime: 1000 * 60 * 15,
  });
