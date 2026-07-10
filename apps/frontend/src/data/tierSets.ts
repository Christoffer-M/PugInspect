import { TIER_SET_RANGES } from "../generated/seasonConfig";

/**
 * Community tier numbers ("T35") by Blizzard item-set id range. Sets outside
 * these ranges — older tiers, crafted and PvP sets — get no number and fall
 * back to their full name.
 */
export function getTierNumber(setId: number): number | null {
  return TIER_SET_RANGES.find((r) => setId >= r.from && setId <= r.to)?.tier ?? null;
}
