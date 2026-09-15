import { describe, expect, it } from "vitest";
import { directoryRows } from "./leaderboardCrawler.js";

const member = (name: string, slug: string | undefined, specId: number) => ({
  profile: { name, realm: { slug } },
  specialization: { id: specId },
});

describe("directoryRows", () => {
  it("keeps one row per character with its latest run, across dungeons", () => {
    const rows = directoryRows("eu", [
      { leading_groups: [{ completed_timestamp: 2000, members: [member("Mørk", "kazzak", 250)] }] },
      {
        leading_groups: [
          { completed_timestamp: 1000, members: [member("mørk", "kazzak", 251), member("Other", "draenor", 62)] },
          { completed_timestamp: 3000, members: [member("Mørk", "draenor", 252)] },
        ],
      },
      {},
    ]);

    expect(rows).toEqual([
      { region: "eu", realm: "kazzak", name: "mørk", specId: 250, lastSeenAt: new Date(2000) },
      { region: "eu", realm: "draenor", name: "other", specId: 62, lastSeenAt: new Date(1000) },
      { region: "eu", realm: "draenor", name: "mørk", specId: 252, lastSeenAt: new Date(3000) },
    ]);
  });

  it("skips members without a realm slug", () => {
    expect(directoryRows("us", [{ leading_groups: [{ completed_timestamp: 1, members: [member("A", undefined, 1)] }] }])).toEqual([]);
  });
});
