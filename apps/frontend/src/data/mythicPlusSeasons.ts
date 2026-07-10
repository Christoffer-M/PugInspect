import { MYTHIC_PLUS_SEASONS } from "../generated/seasonConfig";

export { MYTHIC_PLUS_SEASONS, DEFAULT_MYTHIC_PLUS_SEASON } from "../generated/seasonConfig";

export function getMythicPlusZoneId(seasonSlug: string): number | undefined {
  return MYTHIC_PLUS_SEASONS[seasonSlug]?.zoneId;
}
