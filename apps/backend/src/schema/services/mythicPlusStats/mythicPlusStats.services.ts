import { createLogger } from "../../utils/logger.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { isRateLimitError } from "../warcraftLogs/wclGraphQLClient.js";
import { getMplusStats, getMplusStatsMeta, replaceMplusStats } from "../../../db/mplusStats.js";
import { MYTHIC_PLUS_SEASONS, DEFAULT_MYTHIC_PLUS_SEASON } from "../../../generated/seasonConfig.js";
import { crawlDungeon, parseZone, PAGES_PER_SPEC, type RankingsFetcher } from "./crawler.js";
import { aggregate, MIN_PARSES_TO_RANK, type Parse } from "./stats.js";
import { SPECS } from "./specs.js";
import type { MplusSpecStat } from "../../../db/schema.js";

const logger = createLogger({ service: "MythicPlusStats" });

/**
 * Leave this much of the hourly budget for live character lookups. A full
 * refresh measures ~650 points, so the crawl fits comfortably underneath.
 */
const POINTS_BUDGET_CEILING = 2_400;
const RETRY_DELAYS_MS = [1_000, 4_000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const defaultZoneId = (): number | undefined =>
  MYTHIC_PLUS_SEASONS[DEFAULT_MYTHIC_PLUS_SEASON]?.zoneId;

export const knownZoneIds = (): number[] =>
  Object.values(MYTHIC_PLUS_SEASONS).flatMap((s) => (s.zoneId != null ? [s.zoneId] : []));

/**
 * The crawl is thousands of sequential requests, so a single transient failure
 * must not discard the whole sweep. Rate-limit errors are not retried — the
 * client's circuit breaker already holds those off.
 */
const withRetry: RankingsFetcher = async (encounterId, page, className, specName, metric) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await WarcraftLogsService.getEncounterRankings(encounterId, page, className, specName, metric);
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (isRateLimitError(error) || delay === undefined) throw error;
      logger.warn("Rankings page failed, retrying", {
        encounterId,
        className,
        specName,
        page,
        attempt: attempt + 1,
        error: String(error),
      });
      await sleep(delay);
    }
  }
};

export type RefreshResult = {
  zoneId: number;
  parses: number;
  rows: number;
  requests: number;
  keyLevels: number[];
  /**
   * WarcraftLogs API points spent during the crawl window. The hourly counter
   * is per API client, so concurrent character lookups land in here too.
   */
  points: number | null;
  durationMs: number;
};

export async function refreshMythicPlusStats(
  zoneId: number,
  fetchPage: RankingsFetcher = withRetry
): Promise<RefreshResult | null> {
  const start = Date.now();

  const rateLimit = await WarcraftLogsService.getRateLimit();
  if (rateLimit && rateLimit.pointsSpentThisHour > POINTS_BUDGET_CEILING) {
    logger.info("Skipping Mythic+ stats refresh, rate-limit budget too low", {
      zoneId,
      pointsSpentThisHour: rateLimit.pointsSpentThisHour,
      ceiling: POINTS_BUDGET_CEILING,
    });
    return null;
  }

  const { encounters } = parseZone(await WarcraftLogsService.getMythicPlusZone(zoneId));
  if (encounters.length === 0) {
    logger.warn("No encounters for Mythic+ zone, skipping refresh", { zoneId });
    return null;
  }

  const parses: Parse[] = [];
  const seenKeyLevels = new Set<number>();
  let requests = 1;

  for (const encounter of encounters) {
    const crawl = await crawlDungeon(fetchPage, encounter.id, encounter.name);
    parses.push(...crawl.parses);
    crawl.keyLevels.forEach((k) => seenKeyLevels.add(k));
    requests += crawl.requests;
  }

  const keyLevels = [...seenKeyLevels].sort((a, b) => a - b);
  const floor = keyLevels[0];
  if (floor === undefined || parses.length === 0) {
    logger.warn("Mythic+ crawl produced no parses", { zoneId, requests });
    return null;
  }

  // One scope covering everything sampled — the page has no key filter; each
  // spec's medianKey reports where its runs actually happen.
  const rows = aggregate(parses, [floor]).map((r) => ({ ...r, zoneId }));
  // Healers are sampled on both healing and damage, so they hold two parses per
  // run — count each run once, the way the page reports it.
  const runs = parses.filter((p) => !(p.role === "HEALER" && p.metric === "dps")).length;
  const persisted = await replaceMplusStats(zoneId, rows, {
    zoneId,
    keyLevels,
    totalParses: runs,
    dungeons: encounters.map((e) => ({ id: e.id, name: e.name })),
    requests,
  });
  if (!persisted) return null;

  // ponytail: a crawl that straddles the hourly reset reads lower than it
  // started; report null rather than a negative. Live lookups share the same
  // counter — the crawl dominates it, and WCL gives no per-query cost to
  // separate them.
  const after = await WarcraftLogsService.getRateLimit();
  const spent = after && rateLimit ? after.pointsSpentThisHour - rateLimit.pointsSpentThisHour : null;

  const result = {
    zoneId,
    parses: runs,
    rows: rows.length,
    requests,
    keyLevels,
    points: spent != null && spent >= 0 ? spent : null,
    durationMs: Date.now() - start,
  };
  logger.info("Mythic+ spec stats refreshed", result);
  return result;
}

const SPEC_BY_KEY = new Map(SPECS.map((s) => [`${s.classSlug}/${s.specSlug}`, s]));

export type SpecStatDto = {
  classSlug: string;
  specSlug: string;
  className: string;
  specName: string;
  role: string;
  metric: string;
  parses: number;
  median: number;
  p95: number;
  max: number;
  medianKey: number;
  maxKey: number | null;
  dungeons: {
    encounterId: number;
    parses: number;
    median: number;
    p95: number;
    max: number;
    medianKey: number;
    maxKey: number | null;
    maxReportUrl: string | null;
  }[];
};

export type MythicPlusSpecStatsDto = {
  zoneId: number;
  refreshedAt: string;
  keyFloor: number;
  keyLevels: number[];
  totalParses: number;
  minParsesToRank: number;
  /** How many of the fastest runs per dungeon and keystone level were sampled. */
  sampleDepth: number;
  minKeyLevel: number;
  dungeons: { encounterId: number; name: string }[];
  specs: SpecStatDto[];
};

const reportUrl = (code: string | null, fightId: number | null): string | null =>
  code
    ? `https://www.warcraftlogs.com/reports/${code}${fightId != null ? `#fight=${fightId}` : ""}`
    : null;

export async function getMythicPlusSpecStats(
  zoneId: number
): Promise<MythicPlusSpecStatsDto | null> {
  const meta = await getMplusStatsMeta(zoneId);
  if (!meta || meta.keyLevels.length === 0) return null;

  // Rows are read unfiltered and carry their own keyFloor: deriving the floor
  // from meta and filtering on it opened a race across the hourly replace
  // commit (stale meta + fresh rows → empty page).
  const rows = await getMplusStats(zoneId);
  if (rows.length === 0) return null;
  const keyFloor = rows[0]!.keyFloor;

  const pooled = rows.filter((r) => r.encounterId === 0);
  // Healer specs carry two row sets (hps and dps), so detail rows are keyed
  // per metric as well.
  const detail = new Map<string, MplusSpecStat[]>();
  for (const r of rows) {
    if (r.encounterId === 0) continue;
    const k = `${r.classSlug}/${r.specSlug}/${r.metric}`;
    const list = detail.get(k);
    if (list) list.push(r);
    else detail.set(k, [r]);
  }

  const specs = pooled
    .map((r) => {
      const key = `${r.classSlug}/${r.specSlug}/${r.metric}`;
      const def = SPEC_BY_KEY.get(`${r.classSlug}/${r.specSlug}`);
      return {
        classSlug: r.classSlug,
        specSlug: r.specSlug,
        className: def?.className ?? r.classSlug,
        specName: def?.specName ?? r.specSlug,
        role: r.role,
        metric: r.metric,
        parses: r.parses,
        median: r.median,
        p95: r.p95,
        max: r.max,
        medianKey: r.medianKey,
        maxKey: r.maxKey,
        dungeons: (detail.get(key) ?? [])
          .map((d) => ({
            encounterId: d.encounterId,
            parses: d.parses,
            median: d.median,
            p95: d.p95,
            max: d.max,
            medianKey: d.medianKey,
            maxKey: d.maxKey,
            maxReportUrl: reportUrl(d.maxReportCode, d.maxFightId),
          }))
          .sort((a, b) => b.median - a.median),
      };
    })
    // Rows sort by raw throughput; specs too thin to rank drop to the bottom.
    .sort((a, b) => {
      const aThin = a.parses < MIN_PARSES_TO_RANK;
      const bThin = b.parses < MIN_PARSES_TO_RANK;
      if (aThin !== bThin) return aThin ? 1 : -1;
      return b.median - a.median;
    });

  return {
    zoneId,
    refreshedAt: meta.refreshedAt.toISOString(),
    keyFloor,
    keyLevels: meta.keyLevels,
    // Healer specs carry two metric rows over the same runs — count them once.
    totalParses: pooled
      .filter((r) => !(r.role === "HEALER" && r.metric === "dps"))
      .reduce((sum, r) => sum + r.parses, 0),
    minParsesToRank: MIN_PARSES_TO_RANK,
    sampleDepth: PAGES_PER_SPEC * 100,
    minKeyLevel: keyFloor,
    dungeons: meta.dungeons.map((d) => ({ encounterId: d.id, name: d.name })),
    specs,
  };
}
