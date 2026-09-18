import type { MythicPlusRun } from "@repo/graphql-types";
import type { RaiderIoCharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";

export function mapRecentRuns(profile: RaiderIoCharacterApiResponse): MythicPlusRun[] {
  return (profile.mythic_plus_recent_runs ?? []).map((run) => ({
    dungeonId: run.map_challenge_mode_id,
    dungeon: run.dungeon,
    keyLevel: run.mythic_level,
    completedAt: run.completed_at,
    upgrades: run.num_keystone_upgrades,
    spec: run.spec.name,
    url: run.url,
  }));
}
