import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import { SearchResult } from "../graphql/graphql";

export const CharacterDataQuery = graphql(`
  query CharacterSearch($searchString: String!, $region: String!) {
    characterSuggestions(searchString: $searchString, region: $region) {
      name
      realm
      region
    }
  }
`);

export const useCharacterSearchQuery = (
  searchString: string,
  region: string,
  disabled: boolean = false,
) =>
  useQuery({
    queryKey: ["character-search", searchString, region],
    enabled: searchString.length >= 3 && !disabled,
    retry: false,
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await execute(CharacterDataQuery, {
        searchString,
        region,
      });

      return response.characterSuggestions;
    },
  });
