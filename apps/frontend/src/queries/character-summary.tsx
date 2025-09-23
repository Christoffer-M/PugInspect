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
        all {
          score
          color
        }
        dps {
          score
          color
        }
        healer {
          score
          color
        }
        tank {
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
