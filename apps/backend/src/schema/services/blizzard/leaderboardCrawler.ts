import { createLogger } from "../../utils/logger.js";
import { normalizeName } from "../../utils/helpers.js";
import { VALID_REGIONS } from "../../utils/regions.js";
import { BlizzardService } from "./blizzard.services.js";
import { upsertDirectory } from "../../../db/characterDirectory.js";
import type { NewCharacterDirectoryEntry } from "../../../db/schema.js";

const logger = createLogger({ service: "LeaderboardCrawler" });

const UPSTREAM_TIMEOUT_MS = 10_000;
/**
 * Measured Sept 2026: 184 connected realms × (1 index + 8 dungeons) ≈ 1,650
 * requests and ~3 minutes per pass, against Blizzard's 36,000/hour. Every 6h
 * keeps the weekly board's late finishers from being lost at reset without
 * denting live lookups. Boards cap at 500 groups, which busy EU realms hit.
 */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

type Href = { href: string };

export type MythicLeaderboard = {
  leading_groups?: {
    completed_timestamp: number;
    members: {
      profile: { name: string; realm: { slug?: string } };
      specialization?: { id: number };
    }[];
  }[];
};

/**
 * Flatten leaderboards into one directory row per character, keeping the
 * latest run — upsertDirectory needs rows unique per key.
 */
export function directoryRows(region: string, boards: MythicLeaderboard[]): NewCharacterDirectoryEntry[] {
  const rows = new Map<string, NewCharacterDirectoryEntry>();
  for (const group of boards.flatMap((b) => b.leading_groups ?? [])) {
    for (const m of group.members) {
      const realm = m.profile.realm.slug;
      if (!realm) continue;
      const name = normalizeName(m.profile.name);
      const key = `${realm}:${name}`;
      const lastSeenAt = new Date(group.completed_timestamp);
      const prev = rows.get(key);
      if (prev && prev.lastSeenAt >= lastSeenAt) continue;
      rows.set(key, { region, realm, name, specId: m.specialization?.id ?? null, lastSeenAt });
    }
  }
  return [...rows.values()];
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split("?")[0]}`);
  return res.json() as Promise<T>;
}

/**
 * Pause after each realm-week during a season backfill. A regular pass is
 * ~1,650 requests in ~3 minutes; a backfill is that per elapsed week and would
 * otherwise sail past the 36,000/hour budget live lookups share. Measured
 * Sept 2026: 8,000 boards in 57 minutes, ≈ 8,500 requests/hour.
 */
const BACKFILL_REALM_DELAY_MS = 2_000;

/**
 * One pass over the Mythic+ leaderboards for every connected realm in every
 * region — the current week, or with `allPeriods` every week of the current
 * season. A failed realm or dungeon is logged and skipped: the directory is
 * additive, so the next pass fills the gap.
 */
export async function crawlLeaderboards({ allPeriods = false } = {}) {
  const started = Date.now();
  const stats = { realms: 0, boards: 0, groups: 0, characters: 0, failures: 0 };

  for (const region of VALID_REGIONS) {
    const host = `https://${region}.api.blizzard.com`;
    const ns = `namespace=dynamic-${region}`;
    let realmIds: string[];
    // null = whatever week each realm's index says is current
    let periods: number[] | null = null;
    try {
      const token = await BlizzardService.getToken();
      const index = await getJson<{ connected_realms: Href[] }>(`${host}/data/wow/connected-realm/index?${ns}`, token);
      realmIds = index.connected_realms.flatMap((r) => r.href.match(/connected-realm\/(\d+)/)?.[1] ?? []);
      if (allPeriods) {
        const seasons = await getJson<{ current_season: { id: number } }>(`${host}/data/wow/mythic-keystone/season/index?${ns}`, token);
        const season = await getJson<{ periods: { id: number }[] }>(
          `${host}/data/wow/mythic-keystone/season/${seasons.current_season.id}?${ns}`,
          token
        );
        periods = season.periods.map((p) => p.id);
      }
    } catch (error) {
      stats.failures++;
      logger.warn("Region index failed", { region, error: String(error) });
      continue;
    }

    // ponytail: realms run one at a time (dungeons in parallel) ≈ 30 req/s, well
    // under Blizzard's 100/s; add a pool if a pass ever gets too slow.
    for (const realmId of realmIds) {
      try {
        const token = await BlizzardService.getToken();
        const index = await getJson<{ current_leaderboards?: { id: number; key: Href }[] }>(
          `${host}/data/wow/connected-realm/${realmId}/mythic-leaderboard/index?${ns}`,
          token
        );
        const current = index.current_leaderboards ?? [];
        const urlSets = periods
          ? periods.map((period) =>
              current.map((lb) => `${host}/data/wow/connected-realm/${realmId}/mythic-leaderboard/${lb.id}/period/${period}?${ns}`)
            )
          : [current.map((lb) => lb.key.href)];

        for (const urls of urlSets) {
          const results = await Promise.allSettled(urls.map((url) => getJson<MythicLeaderboard>(url, token)));
          const boards = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
          const failed = results.find((r) => r.status === "rejected");
          if (failed) {
            stats.failures += results.length - boards.length;
            logger.warn("Mythic+ leaderboards failed", { region, realmId, failed: results.length - boards.length, error: String(failed.reason) });
          }

          // Upserted per week, not per realm: a season of boards is ~100 large
          // responses to hold in memory at once.
          const rows = directoryRows(region, boards);
          await upsertDirectory(rows);
          stats.boards += boards.length;
          stats.groups += boards.reduce((n, b) => n + (b.leading_groups?.length ?? 0), 0);
          stats.characters += rows.length;
          if (periods) await new Promise((r) => setTimeout(r, BACKFILL_REALM_DELAY_MS));
        }
        stats.realms++;
      } catch (error) {
        stats.failures++;
        logger.warn("Connected realm crawl failed", { region, realmId, error: String(error) });
      }
    }
  }

  const result = { ...stats, allPeriods, durationMs: Date.now() - started };
  // Groups arriving with nothing to write means Blizzard's member shape changed
  // (e.g. realm.slug went missing) — the directory would silently stop growing.
  // Counted in groups, not boards: right after weekly reset every board is empty.
  if (stats.groups > 0 && stats.characters === 0) {
    logger.error("Mythic+ leaderboard crawl wrote no characters from non-empty boards", result);
  } else {
    logger.info("Mythic+ leaderboard crawl finished", result);
  }
  return result;
}

let crawlInFlight = false;

async function runOnce() {
  // A pass is minutes long; never let a slow one overlap the next tick.
  if (crawlInFlight) return;
  crawlInFlight = true;
  try {
    await crawlLeaderboards();
  } catch (error) {
    logger.error("Mythic+ leaderboard crawl failed", { error: String(error) });
  } finally {
    crawlInFlight = false;
  }
}

export function startLeaderboardCrawl(): void {
  // ponytail: crawls on every boot, ~1,660 requests per deploy. There is no
  // reliable "last pass" marker — lookups and the seed also write the table —
  // so add a meta row if deploys ever get frequent enough for this to matter.
  void runOnce();
  setInterval(() => void runOnce(), REFRESH_INTERVAL_MS).unref();
}
