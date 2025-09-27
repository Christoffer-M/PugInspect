import { RaiderIo, Maybe, Segment } from "@repo/graphql-types";
import { RaiderIoCharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";

export function mapRaiderIo(
  rioProfile: RaiderIoCharacterApiResponse
): RaiderIo | null {
  if (!rioProfile) return null;

  const base = {
    thumbnailUrl: rioProfile.thumbnail_url,
    race: rioProfile.race,
    class: rioProfile.class,
    specialization: rioProfile.active_spec_name,
  };

  const segments = rioProfile.mythic_plus_scores_by_season?.[0]?.segments;
  const raidProgression = Object.entries(rioProfile.raid_progression || {}).map(
    ([raid, details]) => ({
      raid,
      ...details,
    })
  );

  const bestMythicPlusRuns = rioProfile.mythic_plus_best_runs?.map((run) => ({
    dungeon: run.dungeon,
    key_level: run.mythic_level,
    completed_at: run.completed_at,
    icon_url: run.icon_url,
    background_image_url: run.background_image_url,
    url: run.url,
    keystone_upgrades: run.num_keystone_upgrades,
  }));

  const getSegment = (seg?: {
    color?: string;
    score?: number;
  }): Maybe<Segment> =>
    seg ? { color: seg.color ?? "", score: seg.score ?? 0 } : null;

  return {
    ...base,
    raidProgression,
    bestMythicPlusRuns,
    all: getSegment(segments?.all),
    dps: getSegment(segments?.dps),
    healer: getSegment(segments?.healer),
    tank: getSegment(segments?.tank),
  };
}
