import { describe, it, expect } from "vitest";
import {
  normalizeRealm,
  upperCaseFirstLetter,
  parseCharacterUrl,
  getParseColor,
  getClassColor,
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
