import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./util"; // assumes fetcher does POST requests
import type { Character } from "../generated/graphql";
import { graphql } from "../generated";

const queryKeys = {
  character: (name: string, realm: string, region: string) =>
    ["character", name, realm, region] as const,
};

export const CHARACTER_QUERY = graphql(`
  query Character($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      logs {
        bestPerformanceAverage
        medianPerformanceAverage
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
      raiderIoScore
      thumbnailUrl
    }
  }
`);

export const useCharacterQuery = (
  name: string,
  realm: string,
  region: string,
) => {
  return useQuery({
    queryKey: queryKeys.character(name, realm, region),
    queryFn: async () => {
      const response = await fetcher<{ data: { character: Character } }>(
        `${process.env.API_BASE_URL}/graphql`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: CHARACTER_QUERY.loc?.source.body, // gql AST -> string
            variables: { name, realm, region },
          }),
        },
      );
      return response.data.character;
    },
    enabled: !!name && !!realm && !!region,
  });
};
