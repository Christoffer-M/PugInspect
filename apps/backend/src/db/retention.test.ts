import { describe, expect, it } from "vitest";
import { MAX_RETENTION_DAYS, RETENTION } from "./persistence.js";

describe("snapshot retention windows", () => {
  it("never exceeds Blizzard's 30-day cap on cached Data", () => {
    const tooLong = RETENTION.filter((r) => r.days > MAX_RETENTION_DAYS);
    expect(tooLong.map((r) => r.label)).toEqual([]);
  });

  it("keeps WarcraftLogs the shortest — their API sends no-cache", () => {
    const wcl = RETENTION.find((r) => r.label === "wcl");
    expect(wcl).toBeDefined();
    expect(wcl!.days).toBeLessThanOrEqual(Math.min(...RETENTION.map((r) => r.days)));
  });
});
