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
    "\n  query RosterCharactersCore($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n      }\n    }\n  }\n": typeof types.RosterCharactersCoreDocument,
    "\n  query RosterCharactersRio($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      character {\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n      }\n    }\n  }\n": typeof types.RosterCharactersRioDocument,
    "\n  query RosterCharactersRaidLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      character { raidLogs { bestPerformanceAverage } }\n    }\n  }\n": typeof types.RosterCharactersRaidLogsDocument,
    "\n  query RosterCharactersKeyLogs($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      character { mythicPlusLogs { bestPerformanceAverage } }\n    }\n  }\n": typeof types.RosterCharactersKeyLogsDocument,
};
const documents: Documents = {
    "\n  query RosterCharactersCore($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n      }\n    }\n  }\n": types.RosterCharactersCoreDocument,
    "\n  query RosterCharactersRio($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      character {\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n      }\n    }\n  }\n": types.RosterCharactersRioDocument,
    "\n  query RosterCharactersRaidLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      character { raidLogs { bestPerformanceAverage } }\n    }\n  }\n": types.RosterCharactersRaidLogsDocument,
    "\n  query RosterCharactersKeyLogs($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      character { mythicPlusLogs { bestPerformanceAverage } }\n    }\n  }\n": types.RosterCharactersKeyLogsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersCore($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      role\n      character {\n        class\n        activeSpec\n        equippedItemLevel\n      }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersCoreDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersRio($region: String!, $characters: [RosterCharacterInput!]!) {\n    rosterCharacters(region: $region, characters: $characters) {\n      name\n      realm\n      notFound\n      character {\n        raiderIo {\n          currentSeason { all { score color } }\n          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersRioDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersRaidLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {\n    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {\n      name\n      realm\n      notFound\n      character { raidLogs { bestPerformanceAverage } }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersRaidLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RosterCharactersKeyLogs($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {\n    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {\n      name\n      realm\n      notFound\n      character { mythicPlusLogs { bestPerformanceAverage } }\n    }\n  }\n"): typeof import('./graphql').RosterCharactersKeyLogsDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
