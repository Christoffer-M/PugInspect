type RaidInfo = {
  zoneId: number;
  displayName: string;
  expansion: number;
};

/**
 * Maps Raider.IO raid slugs to raid metadata.
 *
 * When a new raid tier launches:
 *  1. Add the Raider.IO slug (the key used in raid_progression responses)
 *  2. Set the WarcraftLogs zone ID (visible in WCL URLs, e.g. /zone/rankings/44)
 *  3. Set the expansion name
 *
 * Slugs without a zone ID entry will fall back to `undefined`, which tells
 * the WarcraftLogs API to use its default (most recent zone).
 */
export const DEFAULT_RAID = "tier-mn-1";

export const RAID_DIFFICULTY_COLORS = {
  normal: "#22c55e",
  heroic: "#3b82f6",
  mythic: "#f4a50e",
} as const;

export const RAIDS: Record<string, RaidInfo> = {
  sporefall: {
    zoneId: 50,
    displayName: "Sporefall",
    expansion: 11,
  },
  "tier-mn-1": {
    zoneId: 46,
    displayName: "The Voidspire, The Dreamrift, March on Quel'Danas",
    expansion: 11,
  },
  "manaforge-omega": {
    zoneId: 44,
    displayName: "Manaforge Omega",
    expansion: 10,
  },
  "liberation-of-undermine": {
    zoneId: 42,
    displayName: "Liberation of Undermine",
    expansion: 10,
  },
  "blackrock-depths": {
    zoneId: 40,
    displayName: "Blackrock Depths",
    expansion: 10,
  },
  "nerubar-palace": {
    zoneId: 38,
    displayName: "Nerub-ar Palace",
    expansion: 10,
  },
};

const EXPANSION_DISPLAY_NAMES: Record<number, string> = {
  10: "The War Within",
  11: "Midnight",
};

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
