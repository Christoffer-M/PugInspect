import { describe, it, expect } from "vitest";
import { mapRecentRuns } from "./raiderIo.mapper.js";

describe("mapRecentRuns", () => {
  it("maps a Raider.IO recent run to the shared MythicPlusRun shape", () => {
    expect(
      mapRecentRuns({
        mythic_plus_recent_runs: [
          {
            dungeon: "Murder Row",
            map_challenge_mode_id: 587,
            mythic_level: 13,
            completed_at: "2026-09-11T20:15:00.000Z",
            num_keystone_upgrades: 0,
            url: "https://raider.io/mythic-plus-runs/season-mn-2/1-13-murder-row",
            spec: { name: "Beast Mastery" },
          },
        ],
      })
    ).toEqual([
      {
        dungeonId: 587,
        dungeon: "Murder Row",
        keyLevel: 13,
        completedAt: "2026-09-11T20:15:00.000Z",
        upgrades: 0,
        spec: "Beast Mastery",
        url: "https://raider.io/mythic-plus-runs/season-mn-2/1-13-murder-row",
      },
    ]);
  });

  it("treats a missing field as no runs", () => {
    expect(mapRecentRuns({})).toEqual([]);
  });
});
