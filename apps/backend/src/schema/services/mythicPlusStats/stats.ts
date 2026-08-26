import type { SpecRole } from "@repo/graphql-types";

/** A single logged parse, reduced to what the aggregation needs. */
export type Parse = {
  classSlug: string;
  specSlug: string;
  role: SpecRole;
  encounterId: number;
  keyLevel: number;
  amount: number;
  /** Which throughput this parse measures — healers contribute both. */
  metric: "dps" | "hps";
  /** WCL report behind the parse, so the best run can be linked. */
  reportCode?: string;
  fightId?: number;
};

export type StatRow = {
  keyFloor: number;
  /** 0 = pooled across every dungeon. */
  encounterId: number;
  classSlug: string;
  specSlug: string;
  role: SpecRole;
  metric: "dps" | "hps";
  parses: number;
  median: number;
  p95: number;
  max: number;
  /** Typical keystone level behind this row, for the detail label. */
  medianKey: number;
  /** Keystone level of the single best parse — the run behind `max`. */
  maxKey: number;
  /** WCL report of the single best parse, for a verification link. */
  maxReportCode: string | null;
  maxFightId: number | null;
};

/** Below this a spec's median is too noisy to rank; the UI says so explicitly. */
export const MIN_PARSES_TO_RANK = 50;

/** Linear-interpolated percentile over an ascending-sorted array. */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (sortedAsc.length - 1) * Math.min(Math.max(p, 0), 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loVal = sortedAsc[lo] ?? 0;
  const hiVal = sortedAsc[hi] ?? loVal;
  return loVal + (hiVal - loVal) * (idx - lo);
}

export const median = (sortedAsc: number[]) => percentile(sortedAsc, 0.5);

const ascending = (values: number[]) => values.slice().sort((a, b) => a - b);

const bestOf = (parses: Parse[]): Parse =>
  parses.reduce((a, b) => (b.amount > a.amount ? b : a));

/**
 * One row from a set of parses. `median <= p95 <= max` holds by construction —
 * all three come off the same raw sample.
 */
const summarize = (
  base: Pick<StatRow, "keyFloor" | "classSlug" | "specSlug" | "role" | "metric">,
  encounterId: number,
  ps: Parse[]
): StatRow => {
  const amounts = ascending(ps.map((p) => p.amount));
  const best = bestOf(ps);
  return {
    ...base,
    encounterId,
    parses: ps.length,
    median: median(amounts),
    p95: percentile(amounts, 0.95),
    max: best.amount,
    medianKey: Math.round(median(ascending(ps.map((p) => p.keyLevel)))),
    maxKey: best.keyLevel,
    maxReportCode: best.reportCode ?? null,
    maxFightId: best.fightId ?? null,
  };
};

/**
 * Every number here is RAW observed throughput — the median, p95 and max of the
 * parses as WarcraftLogs reported them. Nothing is rescaled.
 *
 * An earlier version normalized each parse against the median of its own
 * (dungeon, keystone, role) bucket and multiplied a reference back on, to stop
 * a spec ranking high merely for being logged in high-damage dungeons or at
 * high keys. It was dropped: the correction cannot separate "this bracket is
 * harder" from "this bracket has better players" from "low keys allow bigger
 * pulls", and those pull in different directions. The output was a
 * counterfactual — what a spec MIGHT do at some common key mix — which could
 * not even be reconciled with the raw `max` beside it (p95 routinely came out
 * above a spec's own best logged parse).
 *
 * So the page shows where specs actually are, not where a model says they might
 * be. The cost is real and deliberate: a spec logged mostly in generous
 * dungeons or at high keys WILL read higher, and `medianKey` is what tells the
 * reader which. The gain is that every number is a real one someone logged.
 *
 * Grouping still matters and is kept: healers are ranked on healing against
 * other healers, and their damage against other healers' damage — never against
 * the DPS field.
 *
 * The input is the fastest-runs sample, not the whole field (see
 * `PAGES_PER_SPEC`), so these are percentiles among runs that went well.
 */
export function aggregate(parses: Parse[], keyFloors: number[]): StatRow[] {
  const rows: StatRow[] = [];

  // Healers appear twice: their healing ranked against healer healing, and
  // their damage ranked against healer damage — never against the DPS field.
  const combos: [SpecRole, "dps" | "hps"][] = [
    ["DPS", "dps"],
    ["TANK", "dps"],
    ["HEALER", "hps"],
    ["HEALER", "dps"],
  ];

  for (const keyFloor of keyFloors) {
    const inScope = parses.filter((p) => p.keyLevel >= keyFloor);

    for (const [role, metric] of combos) {
      const group = inScope.filter((p) => p.role === role && p.metric === metric);
      if (group.length === 0) continue;

      const bySpec = new Map<string, Parse[]>();
      for (const p of group) {
        const k = `${p.classSlug}/${p.specSlug}`;
        const list = bySpec.get(k);
        if (list) list.push(p);
        else bySpec.set(k, [p]);
      }

      for (const specParses of bySpec.values()) {
        const first = specParses[0];
        if (!first) continue;
        const base = {
          keyFloor,
          classSlug: first.classSlug,
          specSlug: first.specSlug,
          role,
          metric,
        };

        rows.push(summarize(base, 0, specParses));

        const byDungeon = new Map<number, Parse[]>();
        for (const p of specParses) {
          const list = byDungeon.get(p.encounterId);
          if (list) list.push(p);
          else byDungeon.set(p.encounterId, [p]);
        }
        for (const [encounterId, dungeonParses] of byDungeon) {
          rows.push(summarize(base, encounterId, dungeonParses));
        }
      }
    }
  }

  return rows;
}
