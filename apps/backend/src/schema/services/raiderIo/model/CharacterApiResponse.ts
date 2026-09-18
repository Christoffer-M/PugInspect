/**
 * Raider.IO /characters/profile — only what we request (fields=
 * mythic_plus_recent_runs) and read. The response also carries the base
 * profile (name, class, thumbnail…), which Blizzard supplies instead.
 */
export interface RaiderIoCharacterApiResponse {
  mythic_plus_recent_runs?: RaiderIoRun[];
}

export interface RaiderIoRun {
  dungeon: string;
  map_challenge_mode_id: number;
  mythic_level: number;
  completed_at: string; // ISO date string
  num_keystone_upgrades: number;
  url: string;
  spec: { name: string };
}
