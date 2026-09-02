/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query RosterCharactersRaid($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        raidLogs { bestPerformanceAverage }\n      }\n    }\n  }\n": typeof types.RosterCharactersRaidDocument,
    "\n  query RosterCharactersKeys($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        mythicPlusLogs { bestPerformanceAverage }\n      }\n    }\n  }\n": typeof types.RosterCharactersKeysDocument,
};
const documents: Documents = {
    "\n  query RosterCharactersRaid($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        raidLogs { bestPerformanceAverage }\n      }\n    }\n  }\n": types.RosterCharactersRaidDocument,
    "\n  query RosterCharactersKeys($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        mythicPlusLogs { bestPerformanceAverage }\n      }\n    }\n  }\n": types.RosterCharactersKeysDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersRaid($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        raidLogs { bestPerformanceAverage }\n      }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersRaidDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersKeys($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n        mythicPlusLogs { bestPerformanceAverage }\n      }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersKeysDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
