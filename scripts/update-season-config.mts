/**
 * Regenerates the seasonConfig.generated.ts files from live API data:
 *
 *   - Raider.IO static-data  → M+ seasons, dungeon pool, raid slugs/names, defaults
 *   - WarcraftLogs zones     → WCL zone IDs (matched by name)
 *   - Blizzard item-set index → new tier-set id blocks (contiguous runs of 13)
 *   - Raidbots talent trees  → hero talent subtree ids (heroTalents.ts)
 *
 * Run with `pnpm season:update` (needs apps/backend/.env for WCL + Blizzard
 * credentials), then review the diff. Hand-maintained inputs live in
 * scripts/season-config.mts. See docs/SEASONAL_UPDATES.md.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPANSIONS,
  MAX_LEVEL,
  ENCHANTABLE_SLOTS,
  RAID_DISPLAY_OVERRIDES,
  TIER_SEED,
} from "./season-config.mts";

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

async function fetchBlizzardItemSetIds(): Promise<number[]> {
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
  const index = await getJson(
    "https://eu.api.blizzard.com/data/wow/item-set/index?namespace=static-eu&locale=en_US",
    { Authorization: `Bearer ${access_token}` }
  );
  return (index.item_sets as { id: number }[]).map((s) => s.id).sort((a, b) => a - b);
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
  const [mplus, wclZones, itemSetIds, heroTalents, ...raidData] = await Promise.all([
    getJson(`https://raider.io/api/v1/mythic-plus/static-data?expansion_id=${current.rioId}`),
    fetchWclZones(),
    fetchBlizzardItemSetIds(),
    fetchHeroTalents(),
    ...EXPANSIONS.map((e) =>
      getJson(`https://raider.io/api/v1/raiding/static-data?expansion_id=${e.rioId}`)
    ),
  ]);

  // --- M+ seasons (current expansion, main seasons that have started) ------
  const seasons = (mplus.seasons as any[]).filter((s) => s.is_main_season && started(s));
  if (seasons.length === 0) throw new Error("No started M+ seasons found");
  seasons.sort((a, b) => Date.parse(a.starts.us) - Date.parse(b.starts.us));

  // Latest season first — the UI dropdown renders in insertion order
  const mythicPlusSeasons: Record<string, object> = {};
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

  // --- Raids (current + previous expansion), newest first ------------------
  const raids: Record<string, object> = {};
  let defaultRaid: string | undefined;
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
      raids[r.slug] = {
        zoneId,
        displayName: RAID_DISPLAY_OVERRIDES[r.slug] ?? r.name,
        expansion: expansion.rioId,
      };
      // Default = newest raid tier of the current expansion; single-boss
      // event raids (e.g. Sporefall) don't count as a tier.
      if (i === 0 && !defaultRaid && r.encounters.length >= 3) defaultRaid = r.slug;
    }
  }
  if (!defaultRaid) throw new Error("No default raid found (≥3 encounters, current expansion)");

  // Raider.IO's profile API only has keywords for the current and previous
  // expansion — raids from older EXPANSIONS entries must be requested as
  // explicit slugs.
  const raidProgressionField = [
    "current-expansion",
    "previous-expansion",
    ...Object.entries(raids)
      .filter(([, r]) => (r as { expansion: number }).expansion !== EXPANSIONS[0]!.rioId)
      .filter(([, r]) => (r as { expansion: number }).expansion !== EXPANSIONS[1]?.rioId)
      .map(([slug]) => slug),
  ].join(":");

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

export const DEFAULT_RAID = ${stringify(defaultRaid)};

// Needed by the Mythic+ spec-meta crawler, which iterates zones/encounters
// server-side rather than taking them as a client argument.
export const MYTHIC_PLUS_SEASONS: Record<string, MythicPlusSeason> = ${stringify(mythicPlusSeasons)};

export const DEFAULT_MYTHIC_PLUS_SEASON = ${stringify(currentSeason.slug)};

export const CURRENT_DUNGEONS: Dungeon[] = ${stringify(dungeons)};

// Raider.IO character-profile \`raid_progression\` field value: keyword scopes
// for current/previous expansion plus explicit slugs for older raids.
export const RAID_PROGRESSION_FIELD = ${stringify(raidProgressionField)};

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

  const frontendPath = resolve(root, "apps/frontend/src/generated/seasonConfig.ts");
  const backendPath = resolve(root, "apps/backend/src/generated/seasonConfig.ts");
  const heroTalentsPath = resolve(root, "apps/backend/src/generated/heroTalents.ts");
  writeFileSync(frontendPath, frontend);
  writeFileSync(backendPath, backend);
  writeFileSync(heroTalentsPath, heroTalentsFile);

  console.log(`Wrote ${frontendPath}`);
  console.log(`Wrote ${backendPath}`);
  console.log(
    `Wrote ${heroTalentsPath} (${new Set(Object.values(heroTalents.byId)).size} hero trees across ${Object.keys(heroTalents.bySpec).length} specs)`
  );
  console.log(
    `Current: ${currentSeason.slug} (default raid: ${defaultRaid}, ${dungeons.length} dungeons, ${tierRanges.length} tier ranges)`
  );
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  console.log(
    "\nReview with `git diff`. At an expansion boundary also update EXPANSIONS,\nMAX_LEVEL and ENCHANTABLE_SLOTS in scripts/season-config.mts."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
