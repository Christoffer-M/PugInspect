import { describe, expect, it } from "vitest";
import { colorForRating, nextRefreshDelay, parseScoreTiers, ratingColor } from "./scoreTiers.service.js";
import { MYTHIC_PLUS_SEASON_SLUGS, PREVIOUS_SEASON_SCORE_TIERS } from "../../../generated/seasonConfig.js";

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

  // Read from the generated config rather than hard-coded, so these hold
  // across season rollovers.
  const [liveSeason] = Object.entries(MYTHIC_PLUS_SEASON_SLUGS)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([, slug]) => slug);

  it("colours the previous season from the frozen config scale, with no fetch", () => {
    const { season, tiers } = PREVIOUS_SEASON_SCORE_TIERS;
    const [topScore, topColor] = tiers[0]!;
    expect(season).not.toBe(liveSeason);
    expect(ratingColor(season, topScore)).toBe(topColor);
  });

  it("has no colour for the live season before its first fetch, or an unknown season", () => {
    expect(ratingColor(liveSeason, 3000)).toBeNull();
    expect(ratingColor("season-that-does-not-exist", 3000)).toBeNull();
    expect(ratingColor(null, 3000)).toBeNull();
  });

  it("refreshes hourly, and retries within minutes after a failure", () => {
    expect(nextRefreshDelay(0)).toBe(3_600_000);
    expect([1, 2, 3, 10].map(nextRefreshDelay)).toEqual([60_000, 120_000, 300_000, 300_000]);
  });
});
