import type { MythicPlus, RaidProgress } from "@repo/graphql-types";

/**
 * What a character_progression_snapshots row holds: the GraphQL shapes as
 * served. Stored mapped rather than raw because the three Blizzard payloads
 * behind it are 50–130 KB each.
 */
export type CharacterProgression = {
  mythicPlus: MythicPlus;
  raidProgression: RaidProgress[];
};

// Blizzard payloads — only the fields the mapper reads.

type Rating = { color: { r: number; g: number; b: number; a: number }; rating: number };

/** /data/wow/mythic-keystone/season/index */
export interface BlizzardSeasonIndex {
  seasons: { id: number }[];
  current_season: { id: number };
}

/** /profile/wow/character/{realm}/{name}/mythic-keystone-profile/season/{id} */
export interface BlizzardKeystoneSeason {
  character: { id: number };
  mythic_rating?: Rating;
  best_runs?: BlizzardKeystoneRun[];
}

export interface BlizzardKeystoneRun {
  completed_timestamp: number;
  /** Milliseconds. */
  duration: number;
  keystone_level: number;
  is_completed_within_time: boolean;
  dungeon: { id: number; name: string };
  mythic_rating: Rating;
  members: { character: { id: number }; specialization: { name: string } }[];
}

/** /profile/wow/character/{realm}/{name}/encounters/raids */
export interface BlizzardRaidEncounters {
  expansions?: { instances: BlizzardRaidInstance[] }[];
}

export interface BlizzardRaidInstance {
  instance: { id: number; name: string };
  modes: {
    difficulty: { type: string };
    progress: {
      completed_count: number;
      encounters: { encounter: { name: string } }[];
    };
  }[];
}
