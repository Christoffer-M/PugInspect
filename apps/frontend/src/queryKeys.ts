import { CharacterRaidLogsQueryVariables, CharacterMythicPlusLogsQueryVariables } from "./graphql/graphql";

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

const characterKey =
  (namespace: string) =>
  (name: string, realm: string, region: string) => {
    const { name: normName, realm: normRealm, region: normRegion } = normalizeCharacterParams(name, realm, region);
    return [namespace, normName, normRealm, normRegion];
  };

export const queryKeys = {
  character: characterKey("character"),
  characterRaiderIo: characterKey("characterRaiderIo"),
  characterGear: characterKey("characterGear"),
  zonePartitions: (zoneId: number) => ["zonePartitions", zoneId],
  characterRaidLogs: (args: CharacterRaidLogsQueryVariables) => {
    const {
      name: normName,
      realm: normRealm,
      region: normRegion,
    } = normalizeCharacterParams(args.name, args.realm, args.region);
    return [
      "characterRaidLogs",
      normName,
      normRealm,
      normRegion,
      args.role,
      args.metric,
      args.difficulty,
      args.byBracket,
      args.zoneId,
      args.partition,
    ];
  },
  characterMythicPlusLogs: (args: CharacterMythicPlusLogsQueryVariables) => {
    const {
      name: normName,
      realm: normRealm,
      region: normRegion,
    } = normalizeCharacterParams(args.name, args.realm, args.region);
    return [
      "characterMythicPlusLogs",
      normName,
      normRealm,
      normRegion,
      args.metric,
      args.zoneId,
      args.partition,
    ];
  },
};
