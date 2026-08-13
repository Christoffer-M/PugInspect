import { describe, it, expect } from "vitest";
import {
  mapRaiderIo,
  mapClassIdToName,
  mapClassIdToSlug,
} from "./raiderIo.mapper.js";
import {
  RaiderIoCharacterApiResponse,
  MythicPlusRun,
} from "../services/raiderIo/model/CharacterApiResponse.js";

// Trimmed-down shape of a real raider.io character API response.
// When a mapping bug shows up, paste the offending real response here as a new fixture.
const baseProfile: RaiderIoCharacterApiResponse = {
  name: "Pugsley",
  race: "Orc",
  class: "Shaman",
  active_spec_name: "Enhancement",
  active_spec_role: "DPS",
  gender: "male",
  faction: "horde",
  achievement_points: 12345,
  thumbnail_url: "https://render.worldofwarcraft.com/thumb.jpg",
  region: "eu",
  realm: "Kazzak",
  last_crawled_at: "2026-06-30T12:00:00.000Z",
  profile_url: "https://raider.io/characters/eu/kazzak/Pugsley",
  profile_banner: "hordebanner1",
};

const bestRun: MythicPlusRun = {
  dungeon: "The Rookery",
  short_name: "ROOK",
  mythic_level: 14,
  keystone_run_id: 111,
  completed_at: "2026-06-28T20:15:00.000Z",
  clear_time_ms: 1500000,
  par_time_ms: 1800000,
  num_keystone_upgrades: 2,
  map_challenge_mode_id: 500,
  zone_id: 1,
  zone_expansion_id: 10,
  icon_url: "https://cdn.raiderio.net/rook-icon.png",
  background_image_url: "https://cdn.raiderio.net/rook-bg.png",
  score: 350.5,
  url: "https://raider.io/mythic-plus-runs/111",
  affixes: [],
  spec: {
    id: 263,
    name: "Enhancement",
    slug: "enhancement",
    class_id: 7,
    role: "dps",
    is_melee: true,
    patch: "11.1",
    ordinal: 2,
  },
  role: "dps",
};

const fullProfile: RaiderIoCharacterApiResponse = {
  ...baseProfile,
  raid_progression: {
    "liberation-of-undermine": {
      summary: "8/8 H",
      expansion_id: 10,
      total_bosses: 8,
      normal_bosses_killed: 8,
      heroic_bosses_killed: 8,
      mythic_bosses_killed: 3,
    },
  },
  mythic_plus_scores_by_season: [
    {
      season: "season-tww-2",
      scores: {
        all: 2800,
        dps: 2800,
        healer: 0,
        tank: 0,
        spec_0: 0,
        spec_1: 0,
        spec_2: 2800,
        spec_3: 0,
      },
      segments: {
        all: { score: 2800, color: "#ff8000" },
        dps: { score: 2800, color: "#ff8000" },
        healer: { score: 0, color: "#ffffff" },
        tank: { score: 0, color: "#ffffff" },
        spec_0: { score: 0, color: "#ffffff" },
        spec_1: { score: 0, color: "#ffffff" },
        spec_2: { score: 2800, color: "#ff8000" },
        spec_3: { score: 0, color: "#ffffff" },
      },
    },
    {
      season: "season-tww-1",
      scores: {
        all: 2500,
        dps: 2500,
        healer: 0,
        tank: 0,
        spec_0: 0,
        spec_1: 0,
        spec_2: 2500,
        spec_3: 0,
      },
      segments: {
        all: { score: 2500, color: "#a335ee" },
        dps: { score: 2500, color: "#a335ee" },
        healer: { score: 0, color: "#ffffff" },
        tank: { score: 0, color: "#ffffff" },
        spec_0: { score: 0, color: "#ffffff" },
        spec_1: { score: 0, color: "#ffffff" },
        spec_2: { score: 2500, color: "#a335ee" },
        spec_3: { score: 0, color: "#ffffff" },
      },
    },
  ],
  mythic_plus_best_runs: [bestRun],
  mythic_plus_recent_runs: [],
};

describe("mapClassIdToName / mapClassIdToSlug", () => {
  it("maps known class ids", () => {
    expect(mapClassIdToName(7)).toBe("Shaman");
    expect(mapClassIdToName(6)).toBe("Death Knight");
    expect(mapClassIdToSlug(6)).toBe("deathknight");
  });

  it("falls back to Unknown for unmapped ids", () => {
    expect(mapClassIdToName(99)).toBe("Unknown");
    expect(mapClassIdToSlug(99)).toBe("unknown");
  });
});

describe("mapRaiderIo", () => {
  it("maps a full profile", () => {
    const result = mapRaiderIo(fullProfile);

    expect(result).not.toBeNull();
    expect(result!.raidProgression).toEqual([
      {
        raid: "liberation-of-undermine",
        summary: "8/8 H",
        expansion_id: 10,
        total_bosses: 8,
        normal_bosses_killed: 8,
        heroic_bosses_killed: 8,
        mythic_bosses_killed: 3,
      },
    ]);

    expect(result!.currentSeason).toEqual({
      season: "season-tww-2",
      all: { score: 2800, color: "#ff8000" },
      dps: { score: 2800, color: "#ff8000" },
      healer: { score: 0, color: "#ffffff" },
      tank: { score: 0, color: "#ffffff" },
    });
    expect(result!.previousSeason.season).toBe("season-tww-1");
    expect(result!.previousSeason.all).toEqual({
      score: 2500,
      color: "#a335ee",
    });

    expect(result!.bestMythicPlusRuns).toEqual([
      {
        dungeon: "The Rookery",
        short_name: "ROOK",
        challange_mode_id: 500,
        key_level: 14,
        completed_at: "2026-06-28T20:15:00.000Z",
        icon_url: "https://cdn.raiderio.net/rook-icon.png",
        background_image_url: "https://cdn.raiderio.net/rook-bg.png",
        url: "https://raider.io/mythic-plus-runs/111",
        keystone_upgrades: 2,
        role: "dps",
        spec: { name: "Enhancement", slug: "enhancement" },
        class: { name: "Shaman", slug: "shaman" },
      },
    ]);
    expect(result!.recentMythicPlusRuns).toEqual([]);
  });

  it("handles a minimal profile without seasons, raids, or runs", () => {
    const result = mapRaiderIo(baseProfile);

    expect(result).not.toBeNull();
    expect(result!.raidProgression).toEqual([]);
    expect(result!.bestMythicPlusRuns).toBeUndefined();
    expect(result!.recentMythicPlusRuns).toBeUndefined();
    expect(result!.currentSeason).toEqual({
      season: null,
      all: null,
      dps: null,
      healer: null,
      tank: null,
    });
    expect(result!.previousSeason.all).toBeNull();
  });

  it("returns null for a missing profile", () => {
    expect(
      mapRaiderIo(undefined as unknown as RaiderIoCharacterApiResponse)
    ).toBeNull();
  });
});
