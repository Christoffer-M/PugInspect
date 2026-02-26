/**
 * Maps Raider.IO raid slugs to WarcraftLogs zone IDs.
 *
 * When a new raid tier launches:
 *  1. Add the Raider.IO slug (the key used in raid_progression responses)
 *  2. Set the WarcraftLogs zone ID (visible in WCL URLs, e.g. /zone/rankings/44)
 *
 * Slugs without a zone ID entry will fall back to `undefined`, which tells
 * the WarcraftLogs API to use its default (most recent zone).
 */
export const RAID_ZONE_IDS: Record<string, number> = {
  "manaforge-omega": 44, // TWW Season 3
  "liberation-of-undermine": 42, // TWW Season 2
  "blackrock-depths": 40, // TWW Season 1 (alt)
  "nerub-ar-palace": 38, // TWW Season 1
};


/** Returns the WarcraftLogs zone ID for a Raider.IO raid slug, or undefined if unknown. */
export function getZoneIdForRaid(raidSlug: string | null | undefined): number | undefined {
  if (!raidSlug) return undefined;
  return RAID_ZONE_IDS[raidSlug];
}
