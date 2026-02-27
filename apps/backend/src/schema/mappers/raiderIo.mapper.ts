import { RaiderIo, Maybe, Segment, MythicPlusRun } from "@repo/graphql-types";

const CLASS_NAMES: Record<number, string> = {
  1: "Warrior",
  2: "Paladin",
  3: "Hunter",
  4: "Rogue",
  5: "Priest",
  6: "Death Knight",
  7: "Shaman",
  8: "Mage",
  9: "Warlock",
  10: "Monk",
  11: "Druid",
  12: "Demon Hunter",
  13: "Evoker",
};

export function mapClassIdToName(classId: number): string {
  return CLASS_NAMES[classId] ?? "Unknown";
}

export function mapClassIdToSlug(classId: number): string {
  return mapClassIdToName(classId).toLowerCase().replace(/ /g, "");
}

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
    role: run.role,
    spec: {
      name: run.spec.name,
      slug: run.spec.slug,
    },
    class: {
      name: mapClassIdToName(run.spec.class_id),
      slug: mapClassIdToSlug(run.spec.class_id),
    },
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

  const segmentsCurrentSeason = rioProfile.mythic_plus_scores_by_season?.[0]?.segments;
  const segmentsPreviousSeason = rioProfile.mythic_plus_scores_by_season?.[1]?.segments;
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
    currentSeason: {
      all: getSegment(segmentsCurrentSeason?.all),
      dps: getSegment(segmentsCurrentSeason?.dps),
      healer: getSegment(segmentsCurrentSeason?.healer),
      tank: getSegment(segmentsCurrentSeason?.tank),
    },
    previousSeason: {
      all: getSegment(segmentsPreviousSeason?.all),
      dps: getSegment(segmentsPreviousSeason?.dps),
      healer: getSegment(segmentsPreviousSeason?.healer),
      tank: getSegment(segmentsPreviousSeason?.tank),
    },
  };
}
