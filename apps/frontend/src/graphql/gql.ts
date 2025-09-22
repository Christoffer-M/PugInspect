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
    "\n  query Character($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      logs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        raidRankings {\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n      name\n      realm\n      region\n\n      thumbnailUrl\n      raiderIoScore {\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n": typeof types.CharacterDocument,
};
const documents: Documents = {
    "\n  query Character($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      logs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        raidRankings {\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n      name\n      realm\n      region\n\n      thumbnailUrl\n      raiderIoScore {\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n": types.CharacterDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Character($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      logs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        raidRankings {\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n      name\n      realm\n      region\n\n      thumbnailUrl\n      raiderIoScore {\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CharacterDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
