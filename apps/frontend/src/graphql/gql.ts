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
    "\n  query CharacterLogs(\n    $name: String!\n    $realm: String!\n    $region: String!\n    $role: RoleType\n    $metric: Metric\n    $difficulty: Difficulty\n    $byBracket: Boolean\n  ) {\n    character(\n      name: $name\n      realm: $realm\n      region: $region\n      role: $role\n      metric: $metric\n      difficulty: $difficulty\n      byBracket: $byBracket\n    ) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        difficulty\n        raidRankings {\n          spec\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n    }\n  }\n": typeof types.CharacterLogsDocument,
    "\n  query CharacterSearch($searchString: String!, $region: String!) {\n    characterSuggestions(searchString: $searchString, region: $region) {\n      name\n      realm\n      region\n    }\n  }\n": typeof types.CharacterSearchDocument,
    "\n  query CharacterSummary($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n      }\n      name\n      realm\n      region\n      raiderIo {\n        thumbnailUrl\n        race\n        class\n        specialization\n        itlvl\n        bestMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        recentMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        raidProgression {\n          raid\n          total_bosses\n          heroic_bosses_killed\n          mythic_bosses_killed\n          normal_bosses_killed\n        }\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n": typeof types.CharacterSummaryDocument,
};
const documents: Documents = {
    "\n  query CharacterLogs(\n    $name: String!\n    $realm: String!\n    $region: String!\n    $role: RoleType\n    $metric: Metric\n    $difficulty: Difficulty\n    $byBracket: Boolean\n  ) {\n    character(\n      name: $name\n      realm: $realm\n      region: $region\n      role: $role\n      metric: $metric\n      difficulty: $difficulty\n      byBracket: $byBracket\n    ) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        difficulty\n        raidRankings {\n          spec\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n    }\n  }\n": types.CharacterLogsDocument,
    "\n  query CharacterSearch($searchString: String!, $region: String!) {\n    characterSuggestions(searchString: $searchString, region: $region) {\n      name\n      realm\n      region\n    }\n  }\n": types.CharacterSearchDocument,
    "\n  query CharacterSummary($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n      }\n      name\n      realm\n      region\n      raiderIo {\n        thumbnailUrl\n        race\n        class\n        specialization\n        itlvl\n        bestMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        recentMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        raidProgression {\n          raid\n          total_bosses\n          heroic_bosses_killed\n          mythic_bosses_killed\n          normal_bosses_killed\n        }\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n": types.CharacterSummaryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CharacterLogs(\n    $name: String!\n    $realm: String!\n    $region: String!\n    $role: RoleType\n    $metric: Metric\n    $difficulty: Difficulty\n    $byBracket: Boolean\n  ) {\n    character(\n      name: $name\n      realm: $realm\n      region: $region\n      role: $role\n      metric: $metric\n      difficulty: $difficulty\n      byBracket: $byBracket\n    ) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n        difficulty\n        raidRankings {\n          spec\n          encounter {\n            id\n            name\n          }\n          rankPercent\n          medianPercent\n          bestAmount\n          totalKills\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CharacterLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CharacterSearch($searchString: String!, $region: String!) {\n    characterSuggestions(searchString: $searchString, region: $region) {\n      name\n      realm\n      region\n    }\n  }\n"): typeof import('./graphql').CharacterSearchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CharacterSummary($name: String!, $realm: String!, $region: String!) {\n    character(name: $name, realm: $realm, region: $region) {\n      warcraftLogs {\n        bestPerformanceAverage\n        medianPerformanceAverage\n        metric\n      }\n      name\n      realm\n      region\n      raiderIo {\n        thumbnailUrl\n        race\n        class\n        specialization\n        itlvl\n        bestMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        recentMythicPlusRuns {\n          dungeon\n          short_name\n          challange_mode_id\n          key_level\n          completed_at\n          icon_url\n          background_image_url\n          url\n          keystone_upgrades\n        }\n        raidProgression {\n          raid\n          total_bosses\n          heroic_bosses_killed\n          mythic_bosses_killed\n          normal_bosses_killed\n        }\n        all {\n          score\n          color\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CharacterSummaryDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
