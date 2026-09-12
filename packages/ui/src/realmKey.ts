/**
 * Lookup key for the realm tables: lowercased, every separator stripped, so
 * "Der Rat von Dalaran", "DerRatvonDalaran" and "der-rat-von-dalaran" all land
 * on one entry.
 *
 * Its own module, with no imports, because scripts/update-season-config.mts
 * builds the table with it — importing it from realm.ts would drag in the
 * generated table the script has yet to write, so deleting that file would
 * leave no way to regenerate it. The two must derive keys identically or every
 * lookup misses.
 */
export const squashRealm = (realm: string) =>
  realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
