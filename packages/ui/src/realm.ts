import { REALM_SLUGS } from "./generated/realmSlugs";
import { squashRealm } from "./realmKey";

export { squashRealm };

/** Canonical WoW realm slug: lowercase, apostrophes/parens removed, spaces → dashes.
 * Diacritics are preserved — "Aggra (Português)" → "aggra-português", the slug form
 * Blizzard, RaiderIO, and WarcraftLogs all accept. Mirrors backend normalizeRealm. */
export const normalizeRealm = (realm: string) =>
  realm
    .trim()
    .toLowerCase()
    .replace(/[''`()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

/** SEASON-CONFIG: Blizzard class file name → display name, for class colors/icons
 * on pending cards. Extend when an expansion adds a class. */
export const CLASS_FILE_NAMES: Record<string, string> = {
  DEATHKNIGHT: "Death Knight",
  DEMONHUNTER: "Demon Hunter",
  DRUID: "Druid",
  EVOKER: "Evoker",
  HUNTER: "Hunter",
  MAGE: "Mage",
  MONK: "Monk",
  PALADIN: "Paladin",
  PRIEST: "Priest",
  ROGUE: "Rogue",
  SHAMAN: "Shaman",
  WARLOCK: "Warlock",
  WARRIOR: "Warrior",
};

/**
 * The addon sends Blizzard-normalized realms ("TarrenMill", "DerRatvonDalaran")
 * — the name in the player's locale, spaces and punctuation stripped. API slugs
 * are dashed ("tarren-mill"), so look the name up in Blizzard's own realm index.
 *
 * `region` is required because realm names are not unique across regions:
 * "Spirestone" is a US and TW realm and also EU "colinas-pardas" under its
 * en_US name. Pass the region the character is on, not the viewer's.
 *
 * The fallback re-inserts dashes at case/digit boundaries, which is only ever a
 * guess: a lowercase word has no boundary before it, so "DerRatvonDalaran"
 * becomes "der-ratvon-dalaran" and Blizzard 404s. It exists for realms opened
 * since the table was last generated — run `pnpm season:update` if you see one.
 */
export function slugRealm(realm: string, region: string): string {
  const squashed = squashRealm(realm);
  const known = REALM_SLUGS[region.toLowerCase()]?.[squashed];
  if (known) return known;
  return normalizeRealm(
    realm.replace(/(\p{Ll})(\p{Lu})/gu, "$1-$2").replace(/(\p{L})(\d)/gu, "$1-$2")
  );
}
