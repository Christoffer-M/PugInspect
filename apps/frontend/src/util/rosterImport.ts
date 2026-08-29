import { normalizeRealm } from "./util";

/**
 * Decoder for PugInspect addon roster export strings:
 *
 *   !PI1!<EncodeForPrint(CompressDeflate(payload))>
 *   payload = region;record;record;...
 *   record  = Name-Realm:CLASSFILE:ROLE[:SPEC]
 *
 * See docs/ROSTER_EXPORT_FORMAT.md - this file and the addon's RosterExport.lua
 * are the two sides of that contract.
 */

export type RosterImportCharacter = {
  name: string;
  /** Slugged realm, same form the character page uses. */
  realm: string;
  /** Blizzard class file name, e.g. "DEATHKNIGHT". Display hint only. */
  classFile?: string;
  role?: "TANK" | "HEALER" | "DPS";
};

export type RosterImport = {
  region: string;
  characters: RosterImportCharacter[];
};

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

const PREFIX = "!PI1!";
const REGIONS = new Set(["us", "eu", "kr", "tw", "cn"]);
// LibDeflate's EncodeForPrint alphabet, in value order 0–63.
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()";
const ROLES: Record<string, RosterImportCharacter["role"]> = { T: "TANK", H: "HEALER", D: "DPS" };

/** Mirror of LibDeflate:DecodeForPrint - little-endian 6-bit groups. */
function decodeForPrint(encoded: string): Uint8Array | null {
  const out: number[] = [];
  let cache = 0;
  let bits = 0;
  for (const ch of encoded) {
    const value = ALPHABET.indexOf(ch);
    if (value === -1) return null;
    cache |= value << bits;
    bits += 6;
    if (bits >= 8) {
      out.push(cache & 0xff);
      cache >>= 8;
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/**
 * SEASON-CONFIG: realms whose API slug can't be derived from the Blizzard-
 * normalized name by the case-boundary heuristic below. Two families:
 * Russian realms have transliterated slugs ("РевущийФьорд" → "howling-fjord"),
 * and apostrophe realms whose stripped apostrophe left a case boundary
 * ("MalGanis" → "malganis", NOT "mal-ganis"). Keyed by the lowercased realm
 * with all separators stripped, which covers every normalization variant the
 * client can send. Extend when Blizzard opens such a realm.
 */
const SPECIAL_REALM_SLUGS: Record<string, string> = {
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

/** Split a "Name-Realm" string on the FIRST dash (realm slugs contain dashes)
 * and slug the realm, including the special-realm table - the single parsing
 * path for both the export-string decoder and manual entry. */
export function parseNameRealm(input: string): { name: string; realm: string } | null {
  const trimmed = input.trim();
  const dash = trimmed.indexOf("-");
  if (dash <= 0) return null;
  const name = trimmed.slice(0, dash).trim();
  const realm = slugRealm(trimmed.slice(dash + 1));
  if (!name || !realm) return null;
  return { name, realm };
}

/**
 * The addon sends Blizzard-normalized realms ("TarrenMill"); API slugs are
 * dashed ("tarren-mill"), so re-insert dashes at case/digit boundaries.
 * ponytail: heuristic - a space and an apostrophe both normalize to a case
 * boundary, so "MalGanis" wrongly becomes "mal-ganis" (slug is "malganis").
 * Fix with a realm table from Blizzard's realm index if it bites.
 */
function slugRealm(realm: string): string {
  const squashed = realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const special = SPECIAL_REALM_SLUGS[squashed];
  if (special) return special;
  return normalizeRealm(
    realm.replace(/(\p{Ll})(\p{Lu})/gu, "$1-$2").replace(/(\p{L})(\d)/gu, "$1-$2")
  );
}

function parsePayload(payload: string): RosterImport | null {
  const [region, ...records] = payload.split(";");
  if (!region || !REGIONS.has(region.toLowerCase()) || records.length === 0) return null;

  const seen = new Set<string>();
  const characters: RosterImportCharacter[] = [];
  for (const record of records) {
    if (!record) continue;
    const [nameRealm = "", classFile, role] = record.split(":");
    const parsed = parseNameRealm(nameRealm);
    if (!parsed) continue;
    const { name, realm } = parsed;
    const key = `${name.toLowerCase()}:${realm}`;
    if (seen.has(key)) continue;
    seen.add(key);
    characters.push({
      name,
      realm,
      classFile: classFile || undefined,
      role: role ? ROLES[role] : undefined,
    });
  }
  return characters.length > 0 ? { region: region.toLowerCase(), characters } : null;
}

/** Decode a pasted export string. Returns null for anything that isn't a valid
 *  !PI1! string - corruption shows as "invalid", never a thrown error. */
export async function decodeRosterImport(pasted: string): Promise<RosterImport | null> {
  const compact = pasted.replace(/\s+/g, "");
  if (!compact.startsWith(PREFIX)) return null;
  const encoded = compact.slice(PREFIX.length);
  if (!encoded) return null;
  const compressed = decodeForPrint(encoded);
  if (!compressed) return null;
  try {
    const stream = new Blob([compressed as BlobPart]).stream().pipeThrough(
      new DecompressionStream("deflate-raw")
    );
    const payload = await new Response(stream).text();
    return parsePayload(payload);
  } catch {
    return null;
  }
}
