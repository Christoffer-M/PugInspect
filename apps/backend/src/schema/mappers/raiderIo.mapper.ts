import { RaiderIo, Maybe, Segment, MythicPlusRun } from "@repo/graphql-types";
import { RaiderIoCharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";

function mapMythicPlusRuns(
  runs?: RaiderIoCharacterApiResponse[
    | "mythic_plus_best_runs"
    | "mythic_plus_recent_runs"]
): MythicPlusRun[] | undefined {
  if (!runs) return undefined;
  return runs.map((run) => ({
    dungeon: run.dungeon,
    short_name: run.short_name,
    challange_mode_id: run.map_challenge_mode_id,
    key_level: run.mythic_level,
    completed_at: run.completed_at,
    icon_url: run.icon_url,
    background_image_url: run.background_image_url,
    url: run.url,
    keystone_upgrades: run.num_keystone_upgrades,
  }));
}

export function mapRaiderIo(
  rioProfile: RaiderIoCharacterApiResponse
): RaiderIo | null {
  if (!rioProfile) return null;

  const base: RaiderIo = {
    thumbnailUrl: rioProfile.thumbnail_url,
    race: rioProfile.race,
    class: rioProfile.class,
    specialization: rioProfile.active_spec_name,
    itlvl: rioProfile.gear?.item_level_equipped,
  };

  const segments = rioProfile.mythic_plus_scores_by_season?.[0]?.segments;
  const raidProgression = Object.entries(rioProfile.raid_progression || {}).map(
    ([raid, details]) => ({
      raid,
      ...details,
    })
  );

  const getSegment = (seg?: {
    color?: string;
    score?: number;
  }): Maybe<Segment> =>
    seg ? { color: seg.color ?? "", score: seg.score ?? 0 } : null;

  return {
    ...base,
    raidProgression,
    bestMythicPlusRuns: mapMythicPlusRuns(rioProfile.mythic_plus_best_runs),
    recentMythicPlusRuns: mapMythicPlusRuns(rioProfile.mythic_plus_recent_runs),
    all: getSegment(segments?.all),
    dps: getSegment(segments?.dps),
    healer: getSegment(segments?.healer),
    tank: getSegment(segments?.tank),
  };
}
