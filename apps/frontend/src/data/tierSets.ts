/**
 * SEASON-CONFIG: community tier numbers ("T35") by Blizzard item-set id range.
 *
 * No API exposes tier numbers — they're community shorthand. Each season's
 * 13 class sets get a contiguous item-set id block; when a new raid tier
 * launches, find the block via the item-set index API and add a line:
 *
 *   GET https://eu.api.blizzard.com/data/wow/item-set/index?namespace=static-eu
 *
 * (see docs/SEASONAL_UPDATES.md). Sets outside these ranges — older tiers,
 * crafted and PvP sets — get no number and fall back to their full name.
 */
const TIER_SET_RANGES: { from: number; to: number; tier: number }[] = [
  { from: 1978, to: 1990, tier: 35 }, // Midnight S1 — Voidspire / Dreamrift
  { from: 1919, to: 1931, tier: 34 }, // TWW S3 — Manaforge Omega
  { from: 1867, to: 1879, tier: 33 }, // TWW S2 — Liberation of Undermine
];

export function getTierNumber(setId: number): number | null {
  return TIER_SET_RANGES.find((r) => setId >= r.from && setId <= r.to)?.tier ?? null;
}
