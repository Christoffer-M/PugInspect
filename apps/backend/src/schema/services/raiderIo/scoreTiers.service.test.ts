import { describe, expect, it } from "vitest";
import { colorForRating, parseScoreTiers, ratingColor } from "./scoreTiers.service.js";

// Shape of https://raider.io/api/v1/mythic-plus/score-tiers (trimmed).
const payload = [
  { score: 200, rgbHex: "#FFFFFF", rgbInteger: [255, 255, 255] },
  { score: 3975, rgbHex: "#ff8000", rgbInteger: [255, 128, 0] },
  { score: 3000, rgbHex: "#a335ee", rgbInteger: [163, 53, 238] },
];

describe("score tiers", () => {
  const tiers = parseScoreTiers(payload);

  it("orders tiers highest first and normalises colours", () => {
    expect(tiers).toEqual([
      { score: 3975, color: "#ff8000" },
      { score: 3000, color: "#a335ee" },
      { score: 200, color: "#ffffff" },
    ]);
  });

  it("colours a rating by the highest tier it reaches", () => {
    expect(colorForRating(tiers, 4100)).toBe("#ff8000");
    expect(colorForRating(tiers, 3975)).toBe("#ff8000");
    expect(colorForRating(tiers, 3179.5)).toBe("#a335ee");
    // Below the lowest tier: the scale bottoms out, it doesn't disappear
    expect(colorForRating(tiers, 50)).toBe("#ffffff");
  });

  it("rejects payloads that would silently mis-colour everything", () => {
    expect(() => parseScoreTiers([])).toThrow();
    expect(() => parseScoreTiers({ error: "rate limited" })).toThrow();
    expect(() => parseScoreTiers([{ score: "3000", rgbHex: "#a335ee" }])).toThrow();
    expect(() => parseScoreTiers([{ score: 3000, rgbHex: "purple" }])).toThrow();
  });

  it("has no colour for a season whose tiers aren't loaded", () => {
    expect(ratingColor("season-mn-2", 3000)).toBeNull();
    expect(ratingColor(null, 3000)).toBeNull();
  });
});
