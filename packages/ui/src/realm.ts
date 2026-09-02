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
 * SEASON-CONFIG: realms whose API slug can't be derived from the Blizzard-
 * normalized name by the case-boundary heuristic below. Two families:
 * Russian realms have transliterated slugs ("РевущийФьорд" → "howling-fjord"),
 * and apostrophe realms whose stripped apostrophe left a case boundary
 * ("MalGanis" → "malganis", NOT "mal-ganis"). Keyed by the lowercased realm
 * with all separators stripped, which covers every normalization variant the
 * client can send. Extend when Blizzard opens such a realm.
 */
export const SPECIAL_REALM_SLUGS: Record<string, string> = {
  // Apostrophe realms with a capital after the apostrophe (US/OCE/EU)
  ahnqiraj: "ahnqiraj",
  alakir: "alakir",
  amanthul: "amanthul",
  dathremar: "dathremar",
  drekthar: "drekthar",
  jubeithos: "jubeithos",
  kelthuzad: "kelthuzad",
  malganis: "malganis",
  moknathal: "moknathal",
  quelthalas: "quelthalas",
  ungoro: "ungoro",
  азурегос: "azuregos",
  борейскаятундра: "borean-tundra",
  вечнаяпесня: "eversong",
  галакронд: "galakrond",
  голдринн: "goldrinn",
  гордунни: "gordunni",
  гром: "grom",
  дракономор: "fordragon",
  корольлич: "lich-king",
  пиратскаябухта: "booty-bay",
  подземье: "deepholm",
  разувий: "razuvious",
  ревущийфьорд: "howling-fjord",
  свежевательдуш: "soulflayer",
  седогрив: "greymane",
  стражсмерти: "deathguard",
  термоштепсель: "thermaplugg",
  ткачсмерти: "deathweaver",
  черныйшрам: "blackscar",
  ясеневыйлес: "ashenvale",
};

/**
 * The addon sends Blizzard-normalized realms ("TarrenMill"); API slugs are
 * dashed ("tarren-mill"), so re-insert dashes at case/digit boundaries.
 * ponytail: heuristic - a space and an apostrophe both normalize to a case
 * boundary, so "MalGanis" wrongly becomes "mal-ganis" (slug is "malganis").
 * Fix with a realm table from Blizzard's realm index if it bites.
 */
export function slugRealm(realm: string): string {
  const squashed = realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const special = SPECIAL_REALM_SLUGS[squashed];
  if (special) return special;
  return normalizeRealm(
    realm.replace(/(\p{Ll})(\p{Lu})/gu, "$1-$2").replace(/(\p{L})(\d)/gu, "$1-$2")
  );
}
