import type { SpecRole } from "@repo/graphql-types";

/** A single logged parse, reduced to what the aggregation needs. */
export type Parse = {
  classSlug: string;
  specSlug: string;
  role: SpecRole;
  encounterId: number;
  keyLevel: number;
  amount: number;
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

const last = (values: number[]) => values[values.length - 1] ?? 0;

export const median = (sortedAsc: number[]) => percentile(sortedAsc, 0.5);

const ascending = (values: number[]) => values.slice().sort((a, b) => a - b);

const bestOf = (parses: Parse[]): Parse =>
  parses.reduce((a, b) => (b.amount > a.amount ? b : a));

const bucketKey = (encounterId: number, keyLevel: number) => `${encounterId}:${keyLevel}`;

/**
 * Raw DPS is not comparable across dungeons or keystone levels — a Ruby Life
 * Pools +15 pull is worth more damage than a Temple of Sethraliss +15 one. So
 * every parse is first divided by the median of its own (dungeon, keystone,
 * role) bucket, the spec's percentiles are taken over those ratios, and the
 * result is multiplied back by the role's overall median throughput.
 *
 * The output is therefore in real DPS/HPS units — which is what the page shows
 * — but a spec cannot climb the table merely by being logged more often in the
 * high-damage dungeons.
 *
 * `max` alone stays RAW: it is presented as "single best parse" and must be a
 * number someone can actually find on WarcraftLogs. A normalized max rescales
 * to a throughput nobody ever logged.
 *
 * The input is the fastest-runs sample, not the whole field (see
 * `PAGES_PER_BRACKET`), so these are percentiles among runs that went well.
 */
export function aggregate(parses: Parse[], keyFloors: number[]): StatRow[] {
  const rows: StatRow[] = [];

  for (const keyFloor of keyFloors) {
    const inScope = parses.filter((p) => p.keyLevel >= keyFloor);

    for (const role of ["DPS", "HEALER", "TANK"] as SpecRole[]) {
      const group = inScope.filter((p) => p.role === role);
      if (group.length === 0) continue;

      const metric: "dps" | "hps" = role === "HEALER" ? "hps" : "dps";

      // Per-(dungeon, keystone) median across every spec in this role.
      const buckets = new Map<string, number[]>();
      for (const p of group) {
        const k = bucketKey(p.encounterId, p.keyLevel);
        const list = buckets.get(k);
        if (list) list.push(p.amount);
        else buckets.set(k, [p.amount]);
      }
      const bucketMedians = new Map<string, number>();
      for (const [k, values] of buckets) bucketMedians.set(k, median(ascending(values)));

      // Scale factors that turn a normalized ratio back into real throughput —
      // one overall, one per dungeon (so dungeon-scoped rows keep each
      // dungeon's real pay level while still being corrected for key mix).
      const referenceRaw = median(ascending(group.map((p) => p.amount)));
      if (referenceRaw <= 0) continue;
      const dungeonReference = new Map<number, number>();
      {
        const byEncounter = new Map<number, number[]>();
        for (const p of group) {
          const list = byEncounter.get(p.encounterId);
          if (list) list.push(p.amount);
          else byEncounter.set(p.encounterId, [p.amount]);
        }
        for (const [enc, values] of byEncounter) {
          dungeonReference.set(enc, median(ascending(values)));
        }
      }

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
        const { classSlug, specSlug } = first;
        const base = { keyFloor, classSlug, specSlug, role, metric };

        // Pooled across dungeons: normalize, then rescale to real units.
        const normalized = ascending(
          specParses
            .map((p) => {
              const bm = bucketMedians.get(bucketKey(p.encounterId, p.keyLevel)) ?? 0;
              return bm > 0 ? p.amount / bm : NaN;
            })
            .filter((v) => Number.isFinite(v))
        );
        if (normalized.length === 0) continue;

        rows.push({
          ...base,
          encounterId: 0,
          parses: normalized.length,
          median: median(normalized) * referenceRaw,
          p95: percentile(normalized, 0.95) * referenceRaw,
          max: bestOf(specParses).amount,
          medianKey: Math.round(median(ascending(specParses.map((p) => p.keyLevel)))),
          maxKey: bestOf(specParses).keyLevel,
        });

        // Per dungeon: normalized against the same per-key buckets, rescaled
        // by that dungeon's own role median. This keeps real cross-dungeon pay
        // differences visible while correcting for key mix — without it, a
        // dungeon-scoped ranking would favor whichever specs happen to play
        // higher keys there.
        const byDungeon = new Map<number, Parse[]>();
        for (const p of specParses) {
          const list = byDungeon.get(p.encounterId);
          if (list) list.push(p);
          else byDungeon.set(p.encounterId, [p]);
        }
        for (const [encounterId, dungeonParses] of byDungeon) {
          const ref = dungeonReference.get(encounterId) ?? 0;
          if (ref <= 0) continue;
          const dNormalized = ascending(
            dungeonParses
              .map((p) => {
                const bm = bucketMedians.get(bucketKey(p.encounterId, p.keyLevel)) ?? 0;
                return bm > 0 ? p.amount / bm : NaN;
              })
              .filter((v) => Number.isFinite(v))
          );
          if (dNormalized.length === 0) continue;
          rows.push({
            ...base,
            encounterId,
            parses: dNormalized.length,
            median: median(dNormalized) * ref,
            p95: percentile(dNormalized, 0.95) * ref,
            max: bestOf(dungeonParses).amount,
            medianKey: Math.round(median(ascending(dungeonParses.map((p) => p.keyLevel)))),
            maxKey: bestOf(dungeonParses).keyLevel,
          });
        }
      }
    }
  }

  return rows;
}
