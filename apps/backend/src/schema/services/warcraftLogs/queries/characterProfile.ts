import { gql } from "graphql-tag";

export const CHARACTER_PROFILE_QUERY = gql`
  query CharacterProfile($name: String!, $server: String!, $region: String!) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        name
        server {
          name
        }
        ssdsad
      }
    }
  }
`;
