/**
 * Regenerates the seasonConfig.generated.ts files from live API data:
 *
 *   - Raider.IO static-data  → M+ seasons, dungeon pool, raid slugs/names, defaults
 *   - WarcraftLogs zones     → WCL zone IDs (matched by name)
 *   - Blizzard item-set index → new tier-set id blocks (contiguous runs of 13)
 *   - Raidbots talent trees  → hero talent subtree ids (heroTalents.ts)
 *   - Blizzard realm index   → realm name → slug, all regions/locales (realmSlugs.ts)
 *
 * Run with `pnpm season:update` (needs apps/backend/.env for WCL + Blizzard
 * credentials), then review the diff. Hand-maintained inputs live in
 * scripts/season-config.mts. See docs/SEASONAL_UPDATES.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPANSIONS,
  MAX_LEVEL,
  ENCHANTABLE_SLOTS,
  RAID_DISPLAY_OVERRIDES,
  TIER_SEED,
} from "./season-config.mts";

// Shared with the runtime so the lookup keys can never drift from the table's.
import { squashRealm } from "../packages/ui/src/realmKey.ts";

/** Regions we serve — same set as the backend's VALID_REGIONS. */
const REGIONS = ["eu", "us", "kr", "tw"] as const;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, "apps/backend/.env"));
} catch {}

const warnings: string[] = [];
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return res.json();
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var ${name} (expected in apps/backend/.env)`);
  return val;
}

async function fetchWclZones() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("WARCRAFTLOGS_CLIENT_ID"),
    client_secret: requireEnv("WARCRAFTLOGS_CLIENT_SECRET"),
  });
  const tokenRes = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) throw new Error(`WCL token: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json();
  const data = await getJson(
    "https://www.warcraftlogs.com/api/v2/client?query=" +
      encodeURIComponent("{ worldData { zones { id name expansion { name } } } }"),
    { Authorization: `Bearer ${access_token}` }
  );
  return data.data.worldData.zones as { id: number; name: string; expansion: { name: string } }[];
}

/** oauth.battle.net is global — per-region hosts drop the POST body on a 302. */
let blizzardTokenPromise: Promise<string> | undefined;
function blizzardToken(): Promise<string> {
  blizzardTokenPromise ??= (async () => {
    const auth = Buffer.from(
      `${requireEnv("BLIZZARD_CLIENT_ID")}:${requireEnv("BLIZZARD_CLIENT_SECRET")}`
    ).toString("base64");
    const tokenRes = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) throw new Error(`Blizzard token: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();
    return access_token as string;
  })();
  return blizzardTokenPromise;
}

async function fetchBlizzardItemSetIds(): Promise<number[]> {
  const access_token = await blizzardToken();
  const index = await getJson(
    "https://eu.api.blizzard.com/data/wow/item-set/index?namespace=static-eu&locale=en_US",
    { Authorization: `Bearer ${access_token}` }
  );
  return (index.item_sets as { id: number }[]).map((s) => s.id).sort((a, b) => a - b);
}

/**
 * Refuse to shrink the realm table by more than a fifth. Blizzard returning a
 * short list is indistinguishable from realms closing, and the failure is
 * total — an empty table sends every realm down the guessing fallback.
 */
type JournalRaid = { id: number; name: string; bosses: string[] };

/**
 * Blizzard's journal raids per expansion (keyed by expansion name, which
 * EXPANSIONS shares with the journal), each with its boss list. Raid
 * progression from the profile API is reported per journal instance, so these
 * ids are what a config raid's progression is summed over.
 */
async function fetchJournalRaids(expansionNames: string[]): Promise<Map<string, JournalRaid[]>> {
  const access_token = await blizzardToken();
  const get = (path: string) =>
    getJson(`https://eu.api.blizzard.com/data/wow/${path}?namespace=static-eu&locale=en_US`, {
      Authorization: `Bearer ${access_token}`,
    });
  const index = await get("journal-expansion/index");
  const byExpansion = new Map<string, JournalRaid[]>();
  for (const name of expansionNames) {
    const tier = (index.tiers as { id: number; name: string }[]).find((t) => t.name === name);
    if (!tier) throw new Error(`No Blizzard journal expansion named "${name}" — check EXPANSIONS`);
    const expansion = await get(`journal-expansion/${tier.id}`);
    byExpansion.set(
      name,
      await Promise.all(
        (expansion.raids as { id: number; name: string }[]).map(async (r) => {
          const instance = await get(`journal-instance/${r.id}`);
          return { id: r.id, name: r.name, bosses: (instance.encounters as { name: string }[]).map((e) => e.name) };
        })
      )
    );
  }
  return byExpansion;
}

/**
 * The Blizzard journal instances a Raider.IO raid covers: the instance with its
 * exact name, else every instance whose bosses all belong to the raid — a
 * multi-instance tier like tier-mn-1 (Voidspire + Dreamrift + March on
 * Quel'Danas). Strict on purpose: this runs once per season and the diff is
 * reviewed, so a near-miss should surface as a warning, not a guess at runtime.
 * Raider.IO-only constructs (the "Awakened" re-runs rename every boss) match
 * nothing, which is correct: Blizzard doesn't track them apart.
 */
function resolveJournalInstances(
  raid: { name: string; slug: string; encounters: { name: string }[] },
  journal: JournalRaid[]
): { instanceIds: number[]; bosses: number } | undefined {
  const exact = journal.find((j) => norm(j.name) === norm(raid.name));
  if (exact) return { instanceIds: [exact.id], bosses: exact.bosses.length };

  const raidBosses = new Set(raid.encounters.map((e) => norm(e.name)));
  const parts = journal.filter((j) => j.bosses.length > 0 && j.bosses.every((b) => raidBosses.has(norm(b))));
  if (!parts.length) return undefined;
  const covered = new Set(parts.flatMap((j) => j.bosses.map(norm)));
  const missing = [...raidBosses].filter((b) => !covered.has(b));
  if (missing.length)
    warnings.push(
      `Raid "${raid.name}" (${raid.slug}) only partly maps to Blizzard instances ${parts
        .map((j) => j.name)
        .join(" + ")} — bosses without an instance: ${missing.join(", ")}`
    );
  return { instanceIds: parts.map((j) => j.id), bosses: parts.reduce((n, j) => n + j.bosses.length, 0) };
}

function assertNoMassRealmLoss(path: string, next: Record<string, Record<string, string>>) {
  let previous: Record<string, Record<string, string>>;
  try {
    const src = readFileSync(path, "utf8");
    previous = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
  } catch {
    return; // No committed table yet (or it is unparseable) — nothing to compare.
  }
  for (const [region, table] of Object.entries(previous)) {
    const before = Object.keys(table).length;
    const after = Object.keys(next[region] ?? {}).length;
    if (before > 0 && after < before * 0.8)
      throw new Error(
        `Realm table for ${region} fell from ${before} to ${after} keys (>20% loss). ` +
          `Blizzard's realm index is probably incomplete — refusing to write a gutted table. ` +
          `Re-run; if the drop is real, delete ${path} to accept it.`
      );
  }
}

/**
 * Realm name → API slug, for every region we serve and every locale Blizzard
 * publishes the name in.
 *
 * The addon sends the realm as WoW's client-side normalized form — the name in
 * the PLAYER's locale with spaces and punctuation stripped ("DerRatvonDalaran",
 * "РевущийФьорд"). Deriving the slug from that by re-inserting dashes at case
 * boundaries is guesswork that breaks on any lowercase word ("von", "of",
 * "des"), so we look the name up instead. Keys are squashed the same way the
 * client normalizes, which collapses every spacing/punctuation variant onto one
 * entry; omitting `locale` makes Blizzard return `name` as a map of every
 * locale, so one request per region covers all of them.
 *
 * Keyed by region because names are NOT unique across them: "Spirestone" is a
 * US/TW realm and also the ru_RU name of EU's "colinas-pardas" (a Russian
 * client there really sends it), and 大漩涡 is EU "the-maelstrom" and US
 * "maelstrom". A region-less table silently hands those players another
 * region's slug.
 */
async function fetchRealmSlugs(): Promise<{
  slugs: Record<string, Record<string, string>>;
  names: Record<string, Record<string, string>>;
}> {
  const access_token = await blizzardToken();
  const byRegion: Record<string, Record<string, string>> = {};
  const namesByRegion: Record<string, Record<string, string>> = {};

  for (const region of REGIONS) {
    const index = await getJson(
      `https://${region}.api.blizzard.com/data/wow/realm/index?namespace=dynamic-${region}`,
      { Authorization: `Bearer ${access_token}` }
    );
    const realms = index.realms as { name: string | Record<string, string>; slug: string }[];
    if (!realms?.length) {
      warnings.push(`Blizzard realm index for ${region} returned no realms — slugs may be stale`);
      continue;
    }
    const table: Record<string, string> = {};
    const displayNames: Record<string, string> = {};
    for (const realm of realms) {
      const names = typeof realm.name === "string" ? [realm.name] : Object.values(realm.name ?? {});
      // en_US for every region, matching the slugs; any locale resolves back
      // through the table below, so a displayed name always round-trips.
      displayNames[realm.slug] =
        (typeof realm.name === "string" ? realm.name : realm.name?.en_US) ?? names[0] ?? realm.slug;
      // The slug itself is a valid input too: the website's roster paste and
      // our own URLs already carry the dashed form.
      for (const variant of [...names, realm.slug]) {
        const key = squashRealm(variant);
        if (!key) continue;
        if (table[key] && table[key] !== realm.slug) {
          warnings.push(
            `Realm name "${variant}" is both "${table[key]}" and "${realm.slug}" in ${region} — kept "${table[key]}"`
          );
          continue;
        }
        table[key] = realm.slug;
      }
    }
    byRegion[region] = Object.fromEntries(
      Object.entries(table).sort(([a], [b]) => (a < b ? -1 : 1))
    );
    namesByRegion[region] = Object.fromEntries(
      Object.entries(displayNames).sort(([a], [b]) => (a < b ? -1 : 1))
    );
  }
  return { slugs: byRegion, names: namesByRegion };
}

/**
 * Hero talent subtree ids, keyed by the trait-node-entry id WarcraftLogs
 * reports in a ranking row's `talents` array.
 *
 * Blizzard's talent-tree API is NOT usable here: it exposes trait DEFINITION
 * ids, a different id space that shares nothing with what WCL sends. Raidbots
 * publishes the same tree dump SimC uses, and its `subTreeNodes[].entries[].id`
 * values are exactly the ids that show up in WCL rows — one per hero tree, so a
 * single id in the row names the tree with no fingerprinting.
 */
async function fetchHeroTalents(): Promise<{
  byId: Record<number, string>;
  bySpec: Record<string, string[]>;
}> {
  const trees = (await getJson(
    "https://www.raidbots.com/static/data/live/talents.json"
  )) as {
    className?: string;
    specName?: string;
    subTreeNodes?: { entries?: { id: number; name: string }[] }[];
  }[];

  const byId: Record<number, string> = {};
  const bySpec: Record<string, string[]> = {};
  for (const spec of trees) {
    // Raidbots spells class and spec out ("Death Knight", "Beast Mastery");
    // WarcraftLogs slugs are the same words without spaces, which is the key
    // the crawler's SPECS roster uses.
    const key = `${spec.className?.replace(/\s+/g, "")}/${spec.specName?.replace(/\s+/g, "")}`;
    const names = new Set<string>();
    for (const node of spec.subTreeNodes ?? [])
      for (const entry of node.entries ?? [])
        if (entry.id && entry.name) {
          byId[entry.id] = entry.name;
          names.add(entry.name);
        }
    if (names.size > 0) bySpec[key] = [...names].sort();
  }

  const specsWithout = 40 - Object.keys(bySpec).length;
  if (specsWithout > 0)
    warnings.push(
      `${specsWithout} of 40 specs have no hero talent trees in the Raidbots dump — their Mythic+ hero talent split will be blank`
    );
  return { byId, bySpec };
}

/** Match a Raider.IO name against WCL zones of the same expansion. */
function matchWclZone(
  rioName: string,
  expansionName: string,
  zones: { id: number; name: string; expansion: { name: string } }[]
): number | undefined {
  const candidates = zones.filter((z) => z.expansion.name === expansionName);
  const target = norm(rioName);
  // Exact, then containment either way (handles "MN Tier 1 (VS / DR / MQD)" ↔ "VS / DR / MQD").
  const exact = candidates.find((z) => norm(z.name) === target);
  if (exact) return exact.id;
  const partial = candidates.filter(
    (z) => target.includes(norm(z.name)) || norm(z.name).includes(target)
  );
  if (partial.length > 1)
    warnings.push(
      `Ambiguous WCL zone match for "${rioName}" (${expansionName}): ${partial
        .map((z) => `${z.name} (${z.id})`)
        .join(", ")} — picked the first`
    );
  if (partial.length === 0)
    warnings.push(`No WCL zone matched "${rioName}" (${expansionName}) — zoneId omitted`);
  return partial[0]?.id;
}

const now = Date.now();
const started = (r: { starts: { us: string } }) => Date.parse(r.starts.us) <= now;

async function main() {
  const current = EXPANSIONS[0]!;
  const [mplus, previousMplus, wclZones, journalRaids, itemSetIds, heroTalents, { slugs: realmSlugs, names: realmNames }, ...raidData] = await Promise.all([
    getJson(`https://raider.io/api/v1/mythic-plus/static-data?expansion_id=${current.rioId}`),
    EXPANSIONS[1]
      ? getJson(`https://raider.io/api/v1/mythic-plus/static-data?expansion_id=${EXPANSIONS[1].rioId}`)
      : { seasons: [] },
    fetchWclZones(),
    fetchJournalRaids(EXPANSIONS.map((e) => e.name)),
    fetchBlizzardItemSetIds(),
    fetchHeroTalents(),
    fetchRealmSlugs(),
    ...EXPANSIONS.map((e) =>
      getJson(`https://raider.io/api/v1/raiding/static-data?expansion_id=${e.rioId}`)
    ),
  ]);

  // --- M+ seasons (current expansion, main seasons that have started) ------
  const seasons = (mplus.seasons as any[]).filter((s) => s.is_main_season && started(s));
  if (seasons.length === 0) throw new Error("No started M+ seasons found");
  seasons.sort((a, b) => Date.parse(a.starts.us) - Date.parse(b.starts.us));

  // Latest season first — the UI dropdown renders in insertion order
  // Typed, not `object`: reading .zoneId off the season objects is the whole
  // point, and `object` let MYTHIC_PLUS_ZONE_ID read it off the wrong one.
  const mythicPlusSeasons: Record<
    string,
    { zoneId?: number; displayName: string; expansion: number }
  > = {};
  for (const s of [...seasons].reverse()) {
    const num = Number(/(\d+)$/.exec(s.slug)?.[1]);
    if (!num) throw new Error(`Cannot parse season number from slug "${s.slug}"`);
    mythicPlusSeasons[s.slug] = {
      zoneId: matchWclZone(`Mythic+ Season ${num}`, current.name, wclZones),
      displayName: `Season ${num}`,
      expansion: current.rioId,
    };
  }
  const currentSeason = seasons[seasons.length - 1]!;
  // The companion falls back to no M+ parses without this, silently — the last
  // time it went undefined it sat in an unmerged PR for two days.
  if (mythicPlusSeasons[currentSeason.slug]?.zoneId === undefined)
    warnings.push(
      `No WCL zone for the current M+ season (${currentSeason.slug}) — the companion's M+ parse lookups will be disabled`
    );
  // Blizzard names M+ seasons only by id. Raider.IO's main seasons carry that
  // id, which lets the backend label a Blizzard season (and key its score
  // colour scale) exactly — including the previous expansion's last season,
  // which is "previous" at an expansion's first season.
  const seasonSlugsByBlizzardId: Record<number, string> = {};
  for (const s of [...(previousMplus.seasons as any[]), ...(mplus.seasons as any[])]) {
    if (!s.is_main_season || !started(s)) continue;
    if (typeof s.blizzard_season_id !== "number")
      throw new Error(`Raider.IO season ${s.slug} has no blizzard_season_id`);
    seasonSlugsByBlizzardId[s.blizzard_season_id] = s.slug;
  }
  if (!Object.values(seasonSlugsByBlizzardId).includes(currentSeason.slug))
    throw new Error(`Current season ${currentSeason.slug} has no Blizzard season id`);

  const dungeons = (currentSeason.dungeons as any[]).map((d) => ({
    id: d.id,
    challenge_mode_id: d.challenge_mode_id,
    slug: d.slug,
    name: d.name,
    short_name: d.short_name,
    keystone_timer_seconds: d.keystone_timer_seconds,
    icon_url: d.icon_url,
    background_image_url: d.background_image_url,
  }));

  // --- Raids (every EXPANSIONS entry), newest first -------------------------
  // Raider.IO's raid list (slugs, names, WCL zones) mapped onto Blizzard's
  // journal instances, which is what profile progression is reported against.
  type RaidEntry = {
    slug: string;
    zoneId: number;
    displayName: string;
    expansion: number;
    /** Absent when Blizzard can't report progression for the raid (logs only). */
    tracked?: { instanceIds: number[]; bosses: number };
  };
  const raidEntries: RaidEntry[] = [];
  for (const [i, expansion] of EXPANSIONS.entries()) {
    const expansionRaids = (raidData[i].raids as any[]).filter(started);
    expansionRaids.sort((a, b) => Date.parse(b.starts.us) - Date.parse(a.starts.us));
    for (const r of expansionRaids) {
      const zoneId = matchWclZone(r.name, expansion.name, wclZones);
      // No WCL zone → no logs to show; leave it out of the dropdown entirely.
      if (!zoneId) {
        warnings.push(`Skipping raid "${r.name}" (${r.slug}) — no WCL zone yet`);
        continue;
      }
      raidEntries.push({
        slug: r.slug,
        zoneId,
        displayName: RAID_DISPLAY_OVERRIDES[r.slug] ?? r.name,
        expansion: expansion.rioId,
        tracked: resolveJournalInstances(r, journalRaids.get(expansion.name) ?? []),
      });
    }
  }

  // One entry per WCL zone. Two raids share a zone when Raider.IO splits out a
  // re-run (Awakened Amirdrassil = Amirdrassil's zone): the logs are the same,
  // so keep the one Blizzard tracks and drop the duplicate.
  const keptRaids = raidEntries.filter((r) => {
    const sameZone = raidEntries.filter((o) => o.zoneId === r.zoneId);
    const keep = sameZone.length === 1 || (r.tracked ? true : !sameZone.some((o) => o.tracked));
    if (!keep) console.log(`Dropping raid ${r.slug}: shares WCL zone ${r.zoneId} with a raid Blizzard tracks`);
    else if (!r.tracked)
      warnings.push(`Raid ${r.slug} maps to no Blizzard journal instance — listed for logs, no progression`);
    return keep;
  });

  // Default = newest raid tier of the current expansion; single-boss event
  // raids (e.g. Sporefall) don't count as a tier.
  const defaultRaid = keptRaids.find((r) => r.expansion === current.rioId && (r.tracked?.bosses ?? 0) >= 3)?.slug;
  if (!defaultRaid) throw new Error("No default raid found (tracked, ≥3 bosses, current expansion)");
  const defaultRaidBosses = keptRaids.find((r) => r.slug === defaultRaid)!.tracked!.bosses;

  const raids = Object.fromEntries(
    keptRaids.map((r) => [
      r.slug,
      { zoneId: r.zoneId, displayName: r.displayName, expansion: r.expansion, bosses: r.tracked?.bosses },
    ])
  );
  const backendRaids = Object.fromEntries(keptRaids.flatMap((r) => (r.tracked ? [[r.slug, r.tracked]] : [])));

  // --- Tier-set ranges: seed + new contiguous 13-blocks above it -----------
  const tierRanges = [...TIER_SEED].sort((a, b) => a.from - b.from);
  let maxKnownId = tierRanges[tierRanges.length - 1]!.to;
  let nextTier = Math.max(...tierRanges.map((r) => r.tier)) + 1;
  let run: number[] = [];
  const flushRun = () => {
    if (run.length === 13) {
      console.log(
        `Detected tier ${nextTier}: item-set ids ${run[0]}–${run[12]} — sanity-check the set names in the diff`
      );
      tierRanges.push({ from: run[0]!, to: run[12]!, tier: nextTier++ });
    } else if (run.length > 4) {
      warnings.push(
        `Item-set id run ${run[0]}–${run[run.length - 1]} has ${run.length} sets (want 13) — skipped, check manually`
      );
    }
    run = [];
  };
  for (const id of itemSetIds.filter((id) => id > maxKnownId)) {
    if (run.length && id !== run[run.length - 1]! + 1) flushRun();
    run.push(id);
  }
  flushRun();
  tierRanges.sort((a, b) => b.from - a.from);

  // --- Emit ----------------------------------------------------------------
  const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with \`pnpm season:update\` (scripts/update-season-config.mts),
// then review the diff. Sources: Raider.IO static-data, WarcraftLogs zones,
// Blizzard item-set index.
`;
  const stringify = (v: unknown) => JSON.stringify(v, null, 2);

  const frontend = `${header}
import type { Dungeon } from "../data/dungeons/dungeon";

export type MythicPlusSeason = {
  zoneId?: number;
  displayName: string;
  expansion: number;
};

export type RaidInfo = {
  zoneId?: number;
  displayName: string;
  expansion: number;
  /** Boss count Blizzard tracks progression over; absent for a logs-only raid. */
  bosses?: number;
};

export const EXPANSION_DISPLAY_NAMES: Record<number, string> = ${stringify(
    Object.fromEntries(EXPANSIONS.map((e) => [e.rioId, e.name]))
  )};

export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = ${stringify(mythicPlusSeasons)};

export const DEFAULT_MYTHIC_PLUS_SEASON = ${stringify(currentSeason.slug)};

export const RAIDS: Record<string, RaidInfo> = ${stringify(raids)};

export const DEFAULT_RAID = ${stringify(defaultRaid)};

export const TIER_SET_RANGES: { from: number; to: number; tier: number }[] = ${stringify(tierRanges)};

export const CURRENT_DUNGEONS: Dungeon[] = ${stringify(dungeons)};

export const MAX_LEVEL = ${MAX_LEVEL};
`;

  const backend = `${header}
export type MythicPlusSeason = {
  zoneId?: number;
  displayName: string;
  expansion: number;
};

export type Dungeon = {
  id: number;
  challenge_mode_id: number;
  slug: string;
  name: string;
  short_name: string;
  keystone_timer_seconds: number;
  icon_url: string;
  background_image_url: string;
};

export type RaidInfo = {
  /** Blizzard journal instances whose kills make up this raid's progression. */
  instanceIds: number[];
  bosses: number;
};

export const DEFAULT_RAID = ${stringify(defaultRaid)};

// Needed by the Mythic+ spec-meta crawler, which iterates zones/encounters
// server-side rather than taking them as a client argument.
export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = ${stringify(mythicPlusSeasons)};

export const DEFAULT_MYTHIC_PLUS_SEASON = ${stringify(currentSeason.slug)};

export const CURRENT_DUNGEONS: Dungeon[] = ${stringify(dungeons)};

// Blizzard Mythic+ season id → Raider.IO season slug: the season's label and
// the key for its score colour scale.
export const MYTHIC_PLUS_SEASON_SLUGS: Record<number, string> = ${stringify(seasonSlugsByBlizzardId)};

// Raids Blizzard tracks progression for, keyed by the slug every client looks
// progression up by. Resolved from the Blizzard journal at generation time;
// see resolveJournalInstances in the generator.
export const RAIDS: Record<string, RaidInfo> = ${stringify(backendRaids)};

// Slots expected to carry a permanent enchant this era.
export const ENCHANTABLE_SLOTS = ${stringify(ENCHANTABLE_SLOTS)};
`;

  // Backend-only: the crawler resolves ids to names before anything is stored,
  // so the frontend never sees a trait id.
  const heroTalentsFile = `${header}
// Trait-node-entry id → hero talent tree name. WarcraftLogs puts exactly one of
// these ids in a ranking row's \`talents\` array, which is what identifies the
// tree. Source: Raidbots talent dump (subTreeNodes entries).
export const HERO_TALENTS: Record<number, string> = ${stringify(heroTalents.byId)};

// Every hero talent tree each spec CAN pick, keyed by WCL "classSlug/specSlug".
// The page lists a spec's full set so a tree nobody in the sample played reads
// as "nobody played it" rather than silently not existing.
export const HERO_TALENTS_BY_SPEC: Record<string, string[]> = ${stringify(
    heroTalents.bySpec
  )};
`;

  // Companion-only: it needs just the raid slug to pick the right progression row.
  const companion = `${header}
export const DEFAULT_RAID = ${stringify(defaultRaid)};
export const DEFAULT_RAID_BOSSES = ${defaultRaidBosses};
/** WCL zone of the current Mythic+ season, for M+ parse lookups. */
export const MYTHIC_PLUS_ZONE_ID: number | undefined = ${stringify(
    // currentSeason is Raider.IO's raw season object and has no zoneId — the
    // WCL match lands in mythicPlusSeasons, keyed by slug.
    mythicPlusSeasons[currentSeason.slug]?.zoneId
  )};
`;

  const realmSlugsFile = `${header}
// Realm name → API slug, every region and locale. Clients send the realm in the
// player's own locale with separators stripped, so keys are squashed the same
// way; see resolveRealm in ../schema/utils/helpers.ts.
export const REALM_SLUGS: Record<string, Record<string, string>> = ${stringify(realmSlugs)};

// API slug → en_US display name, per region, for showing a realm the backend
// only stored as a slug (character autocomplete).
export const REALM_NAMES: Record<string, Record<string, string>> = ${stringify(realmNames)};
`;

  // Backend only: it resolves every realm a client sends, so clients carry no copy.
  const realmSlugsPath = resolve(root, "apps/backend/src/generated/realmSlugs.ts");
  // A truncated realm index would silently gut the table — every realm breaks
  // at once, and the diff reads as an ordinary deletion in an automated PR.
  // There is no hand-maintained table underneath this any more, so fail loudly.
  assertNoMassRealmLoss(realmSlugsPath, realmSlugs);
  writeFileSync(realmSlugsPath, realmSlugsFile);
  console.log(
    `Wrote ${realmSlugsPath} (${Object.entries(realmSlugs)
      .map(([r, t]) => `${r}: ${Object.keys(t).length}`)
      .join(", ")} name variants)`
  );

  const companionPath = resolve(root, "apps/companion/src/generated/seasonConfig.ts");
  const frontendPath = resolve(root, "apps/frontend/src/generated/seasonConfig.ts");
  const backendPath = resolve(root, "apps/backend/src/generated/seasonConfig.ts");
  const heroTalentsPath = resolve(root, "apps/backend/src/generated/heroTalents.ts");
  writeFileSync(companionPath, companion);
  writeFileSync(frontendPath, frontend);
  writeFileSync(backendPath, backend);
  writeFileSync(heroTalentsPath, heroTalentsFile);

  console.log(`Wrote ${companionPath}`);
  console.log(`Wrote ${frontendPath}`);
  console.log(`Wrote ${backendPath}`);
  console.log(
    `Wrote ${heroTalentsPath} (${new Set(Object.values(heroTalents.byId)).size} hero trees across ${Object.keys(heroTalents.bySpec).length} specs)`
  );
  console.log(
    `Current: ${currentSeason.slug} (default raid: ${defaultRaid}, ${dungeons.length} dungeons, ${tierRanges.length} tier ranges)`
  );
  for (const w of new Set(warnings)) console.warn(`WARNING: ${w}`);
  console.log(
    "\nReview with `git diff`. At an expansion boundary also update EXPANSIONS,\nMAX_LEVEL and ENCHANTABLE_SLOTS in scripts/season-config.mts."
  );
  console.log(
    "\nNew Mythic+ season? Once deployed, backfill the autocomplete directory (~10 min per week of the season so far):\n  docker compose exec -d backend sh -c 'node dist/scripts/crawl-leaderboards.js --periods=all > /tmp/backfill.log 2>&1'\nand read the result with: docker compose exec backend tail -n 5 /tmp/backfill.log"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
