import type { SpecRole } from "@repo/graphql-types";
import { createLogger } from "../../utils/logger.js";
import type { Parse } from "./stats.js";
import { lookupSpec, metricForRole, SPECS } from "./specs.js";
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
 * Rankings are score-sorted, so this takes each spec's ~100 fastest runs of
 * each dungeon (~800 per spec season-wide) — the same depth for all 40 specs.
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
export const PAGES_PER_SPEC = 1;

export type RankingsFetcher = (
  encounterId: number,
  page: number,
  className: string,
  specName: string,
  metric: "dps" | "hps"
) => Promise<{ dps?: CharacterRankingsPage; hps?: CharacterRankingsPage }>;

function toParses(
  page: { dps?: CharacterRankingsPage; hps?: CharacterRankingsPage },
  encounterId: number
): Parse[] {
  const out: Parse[] = [];

  // Healers are ranked on healing, everyone else on damage; each request asks
  // for exactly one metric, so at most one of these lists is present.
  const collect = (rows: CharacterRankingRow[], wantHealers: boolean) => {
    for (const row of rows) {
      const spec = lookupSpec(row.class, row.spec);
      if (!spec) continue;
      if ((spec.role === "HEALER") !== wantHealers) continue;
      if (typeof row.bracketData !== "number") continue;
      if (typeof row.amount !== "number" || row.amount <= 0) continue;
      out.push({
        classSlug: spec.classSlug,
        specSlug: spec.specSlug,
        role: spec.role as SpecRole,
        encounterId,
        keyLevel: row.bracketData,
        amount: row.amount,
      });
    }
  };

  collect(page.dps?.rankings ?? [], false);
  collect(page.hps?.rankings ?? [], true);
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
 * Every parse is later normalized against its own (dungeon, keystone, role)
 * bucket, so specs contributing at different key levels remain comparable —
 * and each spec's `medianKey` reports where its runs actually happen.
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
    const metric = metricForRole(spec.role);
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
