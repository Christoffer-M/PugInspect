import { EXPANSION_DISPLAY_NAMES, RAIDS } from "../generated/seasonConfig";

export { DEFAULT_RAID, RAIDS } from "../generated/seasonConfig";

export const RAID_DIFFICULTY_COLORS = {
  normal: "#22c55e",
  heroic: "#3b82f6",
  mythic: "#f4a50e",
} as const;

/** Returns the WarcraftLogs zone ID for a Raider.IO raid slug, or undefined if unknown. */
export function getZoneIdForRaid(raidSlug: string): number | undefined {
  if (!raidSlug) return undefined;
  return RAIDS[raidSlug]?.zoneId;
}

/** Returns the display name for a Raider.IO raid slug, falling back to the slug itself. */
export function getRaidDisplayName(raidSlug: string): string {
  return RAIDS[raidSlug]?.displayName ?? raidSlug;
}

/** Returns the expansion name for a Raider.IO raid slug, or undefined if unknown. */
export function getRaidExpansion(raidNumber: number): string | undefined {
  return EXPANSION_DISPLAY_NAMES[raidNumber];
}
