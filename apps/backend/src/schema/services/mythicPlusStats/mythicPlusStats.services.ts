import { createLogger } from "../../utils/logger.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { isRateLimitError } from "../warcraftLogs/wclGraphQLClient.js";
import { getMplusStats, getMplusStatsMeta, replaceMplusStats } from "../../../db/mplusStats.js";
import { MYTHIC_PLUS_SEASONS, DEFAULT_MYTHIC_PLUS_SEASON } from "../../../generated/seasonConfig.js";
import { crawlDungeon, parseZone, PAGES_PER_SPEC, type RankingsFetcher } from "./crawler.js";
import {
  aggregate,
  MIN_PARSES_TO_RANK,
  MIN_PARSES_TO_RANK_HERO,
  type Parse,
} from "./stats.js";
import { SPECS } from "./specs.js";
import { HERO_TALENTS_BY_SPEC } from "../../../generated/heroTalents.js";
import type { MplusSpecStat } from "../../../db/schema.js";

const logger = createLogger({ service: "MythicPlusStats" });

/**
 * Leave this much of the hourly budget for live character lookups. A full
 * refresh measures ~765 points, so the crawl fits comfortably underneath.
 * (Talent data rides along free — `includeCombatantInfo` was measured at the
 * same per-request cost as the request without it.)
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

type DungeonStatDto = {
  encounterId: number;
  parses: number;
  median: number;
  p95: number;
  max: number;
  medianKey: number;
  maxKey: number | null;
  maxReportUrl: string | null;
};

/**
 * One hero talent tree's slice of a spec — same numbers, smaller sample.
 * `parses: 0` means the tree exists for the spec but no run of it made the
 * sample; it is listed anyway so an unplayed tree reads as unplayed instead of
 * silently missing.
 */
export type HeroTalentStatDto = {
  name: string;
  parses: number;
  median: number;
  p95: number;
  max: number;
  medianKey: number;
  maxKey: number | null;
  maxReportUrl: string | null;
  dungeons: DungeonStatDto[];
};

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
  dungeons: DungeonStatDto[];
  heroTalents: HeroTalentStatDto[];
};

export type MythicPlusSpecStatsDto = {
  zoneId: number;
  refreshedAt: string;
  keyFloor: number;
  keyLevels: number[];
  totalParses: number;
  minParsesToRank: number;
  /** Same, for a single hero talent tree — a much smaller sample. */
  minParsesToRankHero: number;
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

  // `heroTalent: ""` rows are the spec itself; the rest are its hero talent
  // trees, stored the same way so both views read from one shape.
  const pooled = rows.filter((r) => r.encounterId === 0 && r.heroTalent === "");
  const heroPooled = rows.filter((r) => r.encounterId === 0 && r.heroTalent !== "");
  // Healer specs carry two row sets (hps and dps), so detail rows are keyed
  // per metric — and per hero tree, since each tree has its own dungeon split.
  const detail = new Map<string, MplusSpecStat[]>();
  for (const r of rows) {
    if (r.encounterId === 0) continue;
    const k = `${r.classSlug}/${r.specSlug}/${r.metric}/${r.heroTalent}`;
    const list = detail.get(k);
    if (list) list.push(r);
    else detail.set(k, [r]);
  }

  const dungeonsOf = (key: string): DungeonStatDto[] =>
    (detail.get(key) ?? [])
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
      .sort((a, b) => b.median - a.median);

  /**
   * Every tree the spec can pick, measured ones first. A spec whose whole
   * sample is one tree still lists the others at zero — "nobody in the fastest
   * runs plays this" is the answer, and an absent row cannot say it.
   */
  const heroTalentsFor = (r: MplusSpecStat, key: string): HeroTalentStatDto[] => {
    const roster = HERO_TALENTS_BY_SPEC[`${r.classSlug}/${r.specSlug}`] ?? [];
    // A handful of rows come back tagged with a tree the spec cannot pick
    // (Protection Warrior with Slayer, n=3) — a spec swap mid-key, or combatant
    // info snapshotted against a different loadout. Two or three rows in 1,600,
    // and an impossible combination on the page is worse than a dropped one.
    // Guarded on a non-empty roster so a stale generated file cannot blank the
    // whole split.
    const allowed = roster.length > 0 ? new Set(roster) : null;

    const measured = heroPooled
      .filter(
        (h) =>
          h.classSlug === r.classSlug &&
          h.specSlug === r.specSlug &&
          h.metric === r.metric &&
          (allowed === null || allowed.has(h.heroTalent))
      )
      .map((h) => ({
        name: h.heroTalent,
        parses: h.parses,
        median: h.median,
        p95: h.p95,
        max: h.max,
        medianKey: h.medianKey,
        maxKey: h.maxKey,
        maxReportUrl: reportUrl(h.maxReportCode, h.maxFightId),
        dungeons: dungeonsOf(`${key}/${h.heroTalent}`),
      }))
      .sort((a, b) => b.median - a.median);

    const seen = new Set(measured.map((h) => h.name));
    const unplayed = roster
      .filter((name) => !seen.has(name))
      .map((name) => ({
        name,
        parses: 0,
        median: 0,
        p95: 0,
        max: 0,
        medianKey: 0,
        maxKey: null,
        maxReportUrl: null,
        dungeons: [],
      }));

    return [...measured, ...unplayed];
  };

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
        dungeons: dungeonsOf(`${key}/`),
        heroTalents: heroTalentsFor(r, key),
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
    minParsesToRankHero: MIN_PARSES_TO_RANK_HERO,
    sampleDepth: PAGES_PER_SPEC * 100,
    minKeyLevel: keyFloor,
    dungeons: meta.dungeons.map((d) => ({ encounterId: d.id, name: d.name })),
    specs,
  };
}
