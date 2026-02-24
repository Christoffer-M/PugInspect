export interface RaiderIoCharacterApiResponse {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  active_spec_role: string;
  gender: string;
  faction: string;
  achievement_points: number;
  thumbnail_url: string;
  region: string;
  realm: string;
  last_crawled_at: string; // ISO date string
  profile_url: string;
  profile_banner: string;
  use_animated_banner?: boolean;
  gear?: Gear;
  raid_progression?: Record<string, RaidProgression>;
  mythic_plus_scores_by_season?: MythicPlusSeason[];
  mythic_plus_ranks?: MythicPlusRanks;
  previous_mythic_plus_ranks?: MythicPlusRanks;
  mythic_plus_recent_runs?: MythicPlusRun[];
  mythic_plus_best_runs?: MythicPlusRun[];
  mythic_plus_alternate_runs?: MythicPlusRun[];
  mythic_plus_highest_level_runs?: MythicPlusRun[];
}

export interface Gear {
  item_level_equipped: number;
  item_level_total: number;
  artifact_traits: number;
}

export interface RaidProgression {
  summary: string;
  expansion_id: number;
  total_bosses: number;
  normal_bosses_killed: number;
  heroic_bosses_killed: number;
  mythic_bosses_killed: number;
}

export interface MythicPlusSeason {
  season: string;
  scores: MythicPlusScores;
  segments: Record<keyof MythicPlusScores, MythicPlusSegment>;
}

export interface MythicPlusScores {
  all: number;
  dps: number;
  healer: number;
  tank: number;
  spec_0: number;
  spec_1: number;
  spec_2: number;
  spec_3: number;
}

export interface MythicPlusSegment {
  score: number;
  color: string;
}

export interface MythicPlusRanks {
  overall: MythicPlusRank;
  tank: MythicPlusRank;
  healer: MythicPlusRank;
  dps: MythicPlusRank;
  class: MythicPlusRank;
  class_tank: MythicPlusRank;
  class_healer: MythicPlusRank;
  class_dps: MythicPlusRank;
}

export interface MythicPlusRank {
  world: number;
  region: number;
  realm: number;
}

export interface MythicPlusRun {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  keystone_run_id: number;
  completed_at: string; // ISO date string
  clear_time_ms: number;
  par_time_ms: number;
  num_keystone_upgrades: number;
  map_challenge_mode_id: number;
  zone_id: number;
  zone_expansion_id: number;
  icon_url: string;
  background_image_url: string;
  score: number;
  url: string;
  affixes: MythicPlusAffix[];
  spec: MythicPlusSpec;
  role: string;
}

export interface MythicPlusSpec {
  id: number;
  name: string;
  slug: string;
  class_id: number;
  role: string;
  is_melee: boolean;
  patch: string;
  ordinal: number;
}

export interface MythicPlusAffix {
  id: number;
  name: string;
  description: string;
  icon: string;
  icon_url: string;
  wowhead_url: string;
}
