import type { MythicPlusSeason, RaidProgress } from "@repo/graphql-types";

/** A season as stored. Its colour is derived from the rating at read time
 *  (Raider.IO's scale moves during a season), so it is never stored. */
export type StoredMythicPlusSeason = Omit<MythicPlusSeason, "color" | "__typename">;

/**
 * What a character_progression_snapshots row holds: the GraphQL shapes as
 * served, minus anything derivable. Stored mapped rather than raw because the
 * three Blizzard payloads behind it are 50–130 KB each.
 */
export type CharacterProgression = {
  mythicPlus: { currentSeason: StoredMythicPlusSeason | null; previousSeason: StoredMythicPlusSeason | null };
  raidProgression: RaidProgress[];
};

// Blizzard payloads — only the fields the mapper reads.

type Rating = { rating: number };

/** /data/wow/mythic-keystone/season/index */
export interface BlizzardSeasonIndex {
  seasons: { id: number }[];
  current_season: { id: number };
}

/** /profile/wow/character/{realm}/{name}/mythic-keystone-profile/season/{id} */
export interface BlizzardKeystoneSeason {
  season: { id: number };
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
  instance: { id: number };
  modes: {
    difficulty: { type: string };
    progress: { completed_count: number };
  }[];
}
