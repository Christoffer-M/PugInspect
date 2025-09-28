import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";
import { queryKeys } from "../queryKeys";
import {
  Character,
  CharacterSummaryQuery,
  CharacterSummaryQueryVariables,
} from "../graphql/graphql";

export const CharacterDataQuery = graphql(`
  query CharacterSummary($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      warcraftLogs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric
      }
      name
      realm
      region
      raiderIo {
        thumbnailUrl
        race
        class
        specialization
        itlvl
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
        }
        raidProgression {
          raid
          total_bosses
          heroic_bosses_killed
          mythic_bosses_killed
          normal_bosses_killed
        }
        all {
          score
          color
        }
      }
    }
  }
`);

export const useCharacterSummaryQuery = ({
  name,
  realm,
  region,
}: CharacterSummaryQueryVariables) =>
  useQuery({
    queryKey: queryKeys.character(name, realm, region),
    retry: false,
    queryFn: async (): Promise<Character | undefined | null> => {
      const response = await execute<
        CharacterSummaryQuery,
        CharacterSummaryQueryVariables
      >(CharacterDataQuery, {
        name,
        realm,
        region,
      });

      return response.character;
    },
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
