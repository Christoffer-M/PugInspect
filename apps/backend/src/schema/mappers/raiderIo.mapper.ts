import { RaiderIo, Maybe, Segment } from "@repo/graphql-types";
import { CharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";

export function mapRaiderIo(rioProfile: CharacterApiResponse): RaiderIo | null {
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

  const getSegment = (seg?: {
    color?: string;
    score?: number;
  }): Maybe<Segment> =>
    seg ? { color: seg.color ?? "", score: seg.score ?? 0 } : null;

  return {
    ...base,
    raidProgression,
    all: getSegment(segments?.all),
    dps: getSegment(segments?.dps),
    healer: getSegment(segments?.healer),
    tank: getSegment(segments?.tank),
  };
}
