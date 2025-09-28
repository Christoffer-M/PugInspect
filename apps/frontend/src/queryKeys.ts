import { CharacterLogsQueryVariables } from "./graphql/graphql";

// Helper for normalizing character params
export function normalizeCharacterParams(
  name: string,
  realm: string,
  region: string,
): { name: string; realm: string; region: string } {
  return {
    name: name.toLowerCase(),
    realm: realm.toLowerCase(),
    region: region.toUpperCase(),
  };
}

export const queryKeys = {
  character: (name: string, realm: string, region: string) => {
    const {
      name: normName,
      realm: normRealm,
      region: normRegion,
    } = normalizeCharacterParams(name, realm, region);
    return ["character", normName, normRealm, normRegion];
  },
  characterLogs: (args: CharacterLogsQueryVariables) => {
    const {
      name: normName,
      realm: normRealm,
      region: normRegion,
    } = normalizeCharacterParams(args.name, args.realm, args.region);
    return [
      "characterLogs",
      normName,
      normRealm,
      normRegion,
      args.role,
      args.metric,
      args.difficulty,
      args.byBracket,
    ];
  },
};
