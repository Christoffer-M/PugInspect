type MythicPlusSeason = {
  zoneId: number;
  displayName: string;
  expansion: number;
};

export const DEFAULT_MYTHIC_PLUS_SEASON = "md-s1";

/**
 * SEASON-CONFIG: M+ seasons + DEFAULT_MYTHIC_PLUS_SEASON.
 *
 * Maps M+ season slugs to WarcraftLogs zone metadata.
 *
 * When a new season launches:
 *  1. Add the new season slug as a key
 *  2. Set the WarcraftLogs zone ID (visible in WCL URLs, e.g. /zone/rankings/47)
 *  3. Update DEFAULT_MYTHIC_PLUS_SEASON to the new slug
 */
export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = {
  "md-s1": { zoneId: 47, displayName: "Season 1 - Midnight", expansion: 11 },
};

export function getMythicPlusZoneId(seasonSlug: string): number | undefined {
  return MYTHIC_PLUS_SEASONS[seasonSlug]?.zoneId;
}
