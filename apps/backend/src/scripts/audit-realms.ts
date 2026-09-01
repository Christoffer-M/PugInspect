/**
 * Audits the "Realms tracked" number on /stats against Blizzard's realm index.
 *
 * /stats reports count(distinct (region, realm)) over the characters table
 * (see db/stats.ts). That equals the number of real realms only if every row
 * spells its realm exactly one way, and nothing in the write path guarantees
 * that: region is stored verbatim from the request, and realm is stored as
 * normalizeRealm(input), which lowercases and dashes spaces but cannot insert
 * a dash that was never typed ("tarrenmill" stays "tarrenmill").
 *
 * This script fetches every real realm slug per region from Blizzard and
 * reports how many tracked realms are real, which are not, and what the count
 * would be with case and separator variants collapsed.
 *
 * Read-only — it writes nothing to the database.
 *
 * Run after building:
 *   pnpm build && node dist/scripts/audit-realms.js
 * or, from the repo root against the deployed stack:
 *   docker compose exec backend node dist/scripts/audit-realms.js
 */

import { count } from "drizzle-orm";
import { config } from "../config/index.js";
import { initDb, getDb, closeDb } from "../db/index.js";
import { characters } from "../db/schema.js";
import { BlizzardService } from "../schema/services/blizzard/blizzard.services.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "AuditRealms" });

type TrackedRealm = { region: string; realm: string; characterCount: number };
type RealmIndexResponse = { realms: { id: number; name: string; slug: string }[] };

/** Separator-insensitive realm key: "tarren-mill", "tarrenmill" and
 *  "Tarren Mill" all collapse to "tarrenmill". Same idea as the dedup key in
 *  the 0001_deduplicate_realms migration. */
function realmKey(realm: string): string {
  return realm.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

async function getTrackedRealms(): Promise<TrackedRealm[]> {
  return getDb()
    .select({
      region: characters.region,
      realm: characters.realm,
      characterCount: count(),
    })
    .from(characters)
    .groupBy(characters.region, characters.realm);
}

async function fetchRealmSlugs(region: string, token: string): Promise<string[]> {
  const url = `https://${region}.api.blizzard.com/data/wow/realm/index?namespace=dynamic-${region}&locale=en_US`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Realm index request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as RealmIndexResponse;
  return data.realms.map((r) => r.slug);
}

function line(label: string, value: string | number): string {
  return `  ${label.padEnd(46)}${value}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

async function main() {
  initDb(config.databaseUrl);

  try {
    const tracked = await getTrackedRealms();
    if (!tracked.length) {
      logger.info("No characters tracked yet — nothing to audit.");
      return;
    }

    const regionsInDb = [...new Set(tracked.map((t) => t.region))];
    const auditableRegions = [...new Set(regionsInDb.map((r) => r.toLowerCase()))]
      .filter((r) => VALID_REGIONS.has(r))
      .sort();

    logger.info("Fetching Blizzard realm index", { regions: auditableRegions });
    const token = await BlizzardService.getToken();

    // region → real slugs, plus a separator-insensitive lookup for suggestions
    const realSlugs = new Map<string, Set<string>>();
    const realByKey = new Map<string, string>();
    for (const region of auditableRegions) {
      const slugs = await fetchRealmSlugs(region, token);
      realSlugs.set(region, new Set(slugs));
      for (const slug of slugs) realByKey.set(`${region}:${realmKey(slug)}`, slug);
    }

    const asShipped = tracked.length; // one row per distinct (region, realm)
    const lowercasedRegion = new Set(tracked.map((t) => `${t.region.toLowerCase()}:${t.realm}`)).size;
    const collapsed = new Set(
      tracked.map((t) => `${t.region.toLowerCase()}:${realmKey(t.realm)}`)
    ).size;

    const real: TrackedRealm[] = [];
    const unknown: TrackedRealm[] = [];
    const unauditable: TrackedRealm[] = [];
    for (const t of tracked) {
      const region = t.region.toLowerCase();
      const slugs = realSlugs.get(region);
      if (!slugs) unauditable.push(t);
      else if (slugs.has(t.realm)) real.push(t);
      else unknown.push(t);
    }

    const realDistinct = new Set(real.map((t) => `${t.region.toLowerCase()}:${t.realm}`)).size;

    const out: string[] = [];
    out.push("");
    out.push("Realms tracked");
    out.push(line("as /stats counts it (region, realm)", asShipped));
    out.push(line("with region lowercased", lowercasedRegion));
    out.push(line("with dash/space variants collapsed too", collapsed));
    out.push(line("confirmed against Blizzard's realm index", realDistinct));
    out.push("");
    out.push("Region values as stored");
    for (const region of regionsInDb.sort()) {
      const rows = tracked.filter((t) => t.region === region);
      const chars = rows.reduce((sum, t) => sum + t.characterCount, 0);
      const flag = VALID_REGIONS.has(region) ? "" : "   <- not a lowercase valid region";
      out.push(`  ${region}  ${plural(rows.length, "realm")}, ${plural(chars, "character")}${flag}`);
    }
    out.push("");
    out.push(`Realms Blizzard does not know: ${unknown.length}`);
    for (const t of unknown.sort((a, b) => b.characterCount - a.characterCount)) {
      const suggestion = realByKey.get(`${t.region.toLowerCase()}:${realmKey(t.realm)}`);
      const hint = suggestion && suggestion !== t.realm ? `  (real slug: ${suggestion})` : "";
      out.push(line(`${t.region}/${t.realm}`, `${t.characterCount} characters${hint}`));
    }
    if (unauditable.length) {
      out.push("");
      out.push(`Not auditable (no realm index for that region): ${unauditable.length}`);
      for (const t of unauditable) {
        out.push(line(`${t.region}/${t.realm}`, `${t.characterCount} characters`));
      }
    }
    out.push("");
    if (asShipped === realDistinct && !unauditable.length) {
      out.push("Verdict: every tracked realm is a real realm — the number on /stats is correct.");
    } else {
      out.push(`Verdict: /stats says ${asShipped}; ${realDistinct} of those are real realms.`);
      out.push(line("duplicates from region casing", asShipped - lowercasedRegion));
      out.push(line("duplicates from realm spelling", lowercasedRegion - collapsed));
      out.push(line("slugs Blizzard does not know", unknown.length));
      if (unauditable.length) out.push(line("rows in an unauditable region", unauditable.length));
    }
    out.push("");
    console.log(out.join("\n"));
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  logger.error("Realm audit failed", { error: String(err) });
  process.exit(1);
});
