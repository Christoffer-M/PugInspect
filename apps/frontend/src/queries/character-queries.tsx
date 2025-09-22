import { CharacterQueryVariables } from "../graphql/graphql";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "../graphql";
import { execute } from "../api/graphqlClient";

const queryKeys = {
  character: (name: string, realm: string, region: string) =>
    ["character", name, realm, region] as const,
};

export const CharacterDataQuery = graphql(`
  query Character($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      logs {
        bestPerformanceAverage
        medianPerformanceAverage
        metric
        raidRankings {
          encounter {
            id
            name
          }
          rankPercent
          medianPercent
          bestAmount
          totalKills
        }
      }
      name
      realm
      region

      thumbnailUrl
      raiderIoScore {
        all {
          score
          color
        }
      }
    }
  }
`);

export const useCharacterQuery = ({
  name,
  realm,
  region,
}: CharacterQueryVariables) => {
  return useQuery({
    queryKey: queryKeys.character(name, realm, region),
    retry: false,
    queryFn: async () => {
      const response = await execute(CharacterDataQuery, {
        name,
        realm,
        region,
      });

      return response.character;
    },
    enabled: Boolean(name) && Boolean(realm) && Boolean(region),
  });
};
