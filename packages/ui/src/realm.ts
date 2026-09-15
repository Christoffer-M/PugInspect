export { squashRealm } from "./realmKey";

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
