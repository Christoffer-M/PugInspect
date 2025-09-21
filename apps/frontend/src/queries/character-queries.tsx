import { useQuery } from "@tanstack/react-query";
import type {
  CharacterQuery,
  CharacterQueryVariables,
} from "../generated/graphql";
import { graphql } from "../generated";
import request from "graphql-request";

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
      console.log("Fetching character data...");

      const response = await request<CharacterQuery>(
        "http://localhost:4000",
        CHARACTER_QUERY,
        { name, realm, region },
        {
          "Content-Type": "application/json",
        },
      );
      console.log("Character data fetched:", response);
      return response.character;
    },
    enabled: Boolean(name) && Boolean(realm) && Boolean(region),
  });
};
