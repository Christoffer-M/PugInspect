import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeRealm,
  upperCaseFirstLetter,
  parseCharacterUrl,
  getParseColor,
  getClassColor,
  timeAgo,
  fillDays,
} from "./util";

describe("normalizeRealm", () => {
  it("lowercases, dashes spaces, and strips special characters", () => {
    expect(normalizeRealm("Tarren Mill")).toBe("tarren-mill");
    expect(normalizeRealm("Mal'Ganis")).toBe("malganis");
    expect(normalizeRealm("  Twisting Nether  ")).toBe("twisting-nether");
  });

  it("collapses repeated dashes", () => {
    expect(normalizeRealm("Area 52 - PVP")).toBe("area-52-pvp");
  });

  it("strips parentheses and keeps diacritics", () => {
    expect(normalizeRealm("Aggra (Português)")).toBe("aggra-português");
    expect(normalizeRealm("aggra-(português)")).toBe("aggra-português");
    expect(normalizeRealm("Pozzo dell'Eternità")).toBe("pozzo-delleternità");
  });
});

describe("upperCaseFirstLetter", () => {
  it("capitalizes the first letter and lowercases the rest", () => {
    expect(upperCaseFirstLetter("pugsley")).toBe("Pugsley");
    expect(upperCaseFirstLetter("PUGSLEY")).toBe("Pugsley");
  });
});

describe("parseCharacterUrl", () => {
  it("parses raider.io character URLs", () => {
    expect(
      parseCharacterUrl("https://raider.io/characters/eu/tarren-mill/Pugsley"),
    ).toEqual({ region: "EU", realm: "tarren-mill", name: "Pugsley" });
  });

  it("parses puginspect.com URLs, ignoring query and hash", () => {
    expect(
      parseCharacterUrl("https://puginspect.com/us/area-52/Pugsley?tab=raids#top"),
    ).toEqual({ region: "US", realm: "area-52", name: "Pugsley" });
  });

  it("decodes percent-encoded realm and name", () => {
    expect(
      parseCharacterUrl("https://puginspect.com/eu/tarren%20mill/P%C3%BCgsley"),
    ).toEqual({ region: "EU", realm: "tarren mill", name: "Pügsley" });
  });

  it("returns null for non-character URLs", () => {
    expect(parseCharacterUrl("https://example.com/eu/realm/name")).toBeNull();
    expect(parseCharacterUrl("https://raider.io/guilds/eu/realm/name")).toBeNull();
    expect(parseCharacterUrl("not a url")).toBeNull();
    expect(parseCharacterUrl("")).toBeNull();
  });
});

describe("getParseColor", () => {
  it("maps percentile brackets to quality colors", () => {
    expect(getParseColor(null)).toBe("#5e6a82");
    expect(getParseColor(0)).toBe("#7a8290"); // grey
    expect(getParseColor(25)).toBe("#4ade80"); // green
    expect(getParseColor(50)).toBe("#4d93ff"); // blue
    expect(getParseColor(75)).toBe("#b072f0"); // purple
    expect(getParseColor(95)).toBe("#ff8a3d"); // orange
    expect(getParseColor(99)).toBe("#ff6fae"); // pink
    expect(getParseColor(100)).toBe("#ffd34d"); // gold
  });
});

describe("getClassColor", () => {
  it("looks up class colors case-insensitively", () => {
    expect(getClassColor("Shaman")).toBe("#0070DD");
    expect(getClassColor("death knight")).toBe("#C41E3A");
  });

  it("falls back to dimmed grey for unknown or missing classes", () => {
    expect(getClassColor("Bard")).toBe("#8a96aa");
    expect(getClassColor(null)).toBe("#8a96aa");
    expect(getClassColor(undefined)).toBe("#8a96aa");
  });
});

describe("timeAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats seconds, minutes, hours, and days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
    expect(timeAgo("2026-07-07T11:59:48.000Z")).toBe("Just now");
    expect(timeAgo("2026-07-07T11:57:00.000Z")).toBe("3m ago");
    expect(timeAgo("2026-07-07T09:00:00.000Z")).toBe("3h ago");
    expect(timeAgo("2026-07-05T12:00:00.000Z")).toBe("2d ago");
  });

  it("clamps future timestamps to Just now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
    expect(timeAgo("2026-07-07T12:05:00.000Z")).toBe("Just now");
  });
});

describe("fillDays", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 14 consecutive UTC days ending today, zero-filling gaps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
    const days = fillDays([
      { date: "2026-07-07", count: 42 },
      { date: "2026-07-01", count: 7 },
    ]);

    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ key: "2026-06-24", day: "24", count: 0 });
    expect(days[7]).toEqual({ key: "2026-07-01", day: "1", count: 7 });
    expect(days[13]).toEqual({ key: "2026-07-07", day: "7", count: 42 });
    // every day not in the input is zero
    expect(days.filter((d) => d.count === 0)).toHaveLength(12);
  });

  it("handles an empty input (fresh deploy with no events)", () => {
    const days = fillDays([]);
    expect(days).toHaveLength(14);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});
