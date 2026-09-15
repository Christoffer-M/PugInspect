/**
 * Lookup key for the realm tables: lowercased, every separator stripped, so
 * "Der Rat von Dalaran", "DerRatvonDalaran" and "der-rat-von-dalaran" all land
 * on one entry.
 *
 * Its own module, with no imports, because scripts/update-season-config.mts
 * builds the backend's table with it. The backend's squashRealm must derive
 * keys identically or every lookup misses.
 */
export const squashRealm = (realm: string) =>
  realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
