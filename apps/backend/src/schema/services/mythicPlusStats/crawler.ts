import type { SpecRole } from "@repo/graphql-types";
import { createLogger } from "../../utils/logger.js";
import type { Parse } from "./stats.js";
import { lookupSpec, metricForRole, SPECS } from "./specs.js";
import { HERO_TALENTS } from "../../../generated/heroTalents.js";
import { isRateLimitError } from "../warcraftLogs/wclGraphQLClient.js";
import type {
  CharacterRankingRow,
  CharacterRankingsPage,
  MythicPlusZone,
} from "../warcraftLogs/model/CharacterRankings.js";

const logger = createLogger({ service: "MythicPlusStats" });

const PAGE_SIZE = 100;

/**
 * How many pages of each spec's rankings to sample per dungeon.
 *
 * Rankings are score-sorted, so this takes each spec's ~200 fastest runs of
 * each dungeon (~1,600 per spec season-wide) — the same depth for all 40 specs.
 *
 * Sampling per spec, at equal depth, is the load-bearing choice. Any broader
 * filter (per class, or unfiltered) samples a spec only as deeply as it appears
 * in that population's fastest runs: a spec that is rare within its class shows
 * up only via its very best players and its median inflates — measured live,
 * Fury Warrior (117 class-skimmed parses) out-ranked Assassination Rogue
 * (~1,000) despite Assassination's higher ceiling. With equal per-spec depth
 * the skim severity is the same for everyone.
 *
 * The statistic is therefore throughput among each spec's best runs, not a
 * field median (WarcraftLogs caps every query at 2,000 rows, so a census of the
 * popular keys is not obtainable at any budget).
 */
export const PAGES_PER_SPEC = 2;

export type RankingsFetcher = (
  encounterId: number,
  page: number,
  className: string,
  specName: string,
  metric: "dps" | "hps" | "both"
) => Promise<{ dps?: CharacterRankingsPage; hps?: CharacterRankingsPage }>;

/**
 * The hero talent tree a ranking row was played with, or undefined when the
 * log carried no combatant info (1–8% of rows, measured). Exactly one of a
 * row's talent ids is a hero subtree entry, so the first hit is the answer.
 */
function heroTalentOf(row: CharacterRankingRow): string | undefined {
  for (const t of row.talents ?? []) {
    const tree = t.talentID != null ? HERO_TALENTS[t.talentID] : undefined;
    if (tree) return tree;
  }
  return undefined;
}

function toParses(
  page: { dps?: CharacterRankingsPage; hps?: CharacterRankingsPage },
  encounterId: number
): Parse[] {
  const out: Parse[] = [];

  // Requests are spec-filtered, so each alias list holds only the requested
  // spec; which list a row came from is which throughput it measures. Healer
  // requests carry both lists, everyone else only dps.
  const collect = (rows: CharacterRankingRow[], metric: "dps" | "hps") => {
    for (const row of rows) {
      const spec = lookupSpec(row.class, row.spec);
      if (!spec) continue;
      if (typeof row.bracketData !== "number") continue;
      if (typeof row.amount !== "number" || row.amount <= 0) continue;
      out.push({
        classSlug: spec.classSlug,
        specSlug: spec.specSlug,
        role: spec.role as SpecRole,
        encounterId,
        keyLevel: row.bracketData,
        amount: row.amount,
        metric,
        heroTalent: heroTalentOf(row),
        reportCode: row.report?.code,
        fightId: row.report?.fightID,
      });
    }
  };

  collect(page.dps?.rankings ?? [], "dps");
  collect(page.hps?.rankings ?? [], "hps");
  return out;
}

export type DungeonCrawl = {
  encounterId: number;
  name: string;
  parses: Parse[];
  keyLevels: number[];
  requests: number;
};

/**
 * Sample each spec's fastest runs of one dungeon.
 *
 * `bracket: 0` means all keystone levels in one ranked list, so what comes back
 * is each spec's top parses by raw amount — which skews toward the highest keys
 * that spec is played at. `medianKey` reports where the sampled runs sit, and
 * the page shows it, because nothing downstream corrects for it.
 */
export async function crawlDungeon(
  fetchPage: RankingsFetcher,
  encounterId: number,
  name: string
): Promise<DungeonCrawl> {
  const parses: Parse[] = [];
  const keyLevels = new Set<number>();
  let requests = 0;

  for (const spec of SPECS) {
    // Healers are shown on both healing and damage; one dual-alias request
    // covers both for ~1 extra point.
    const metric = spec.role === "HEALER" ? "both" : metricForRole(spec.role);
    try {
      for (let page = 1; page <= PAGES_PER_SPEC; page++) {
        const result = await fetchPage(encounterId, page, spec.classSlug, spec.specSlug, metric);
        requests++;
        const pageParses = toParses(result, encounterId);
        parses.push(...pageParses);
        pageParses.forEach((p) => keyLevels.add(p.keyLevel));

        const rows = Math.max(
          result.dps?.rankings?.length ?? 0,
          result.hps?.rankings?.length ?? 0
        );
        if (rows < PAGE_SIZE) break;
      }
    } catch (error) {
      // Rate limiting must stop the whole crawl; anything else is isolated to
      // the spec, so one bad slug (the roster is hand-maintained) cannot stall
      // every hourly refresh forever.
      if (isRateLimitError(error)) throw error;
      logger.warn("Spec crawl failed, skipping spec", {
        encounterId,
        name,
        spec: `${spec.classSlug}/${spec.specSlug}`,
        error: String(error),
      });
    }
  }

  logger.debug("Crawled dungeon", { encounterId, name, parses: parses.length, requests });
  return {
    encounterId,
    name,
    parses,
    keyLevels: [...keyLevels].sort((a, b) => a - b),
    requests,
  };
}

export function parseZone(zone: MythicPlusZone | undefined) {
  const encounters = (zone?.encounters ?? []).flatMap((e) =>
    typeof e?.id === "number" && e.name ? [{ id: e.id, name: e.name }] : []
  );
  return { encounters };
}
