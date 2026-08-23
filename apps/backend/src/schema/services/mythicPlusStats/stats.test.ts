import { describe, expect, it } from "vitest";
import { aggregate, percentile, type Parse } from "./stats.js";
import { crawlDungeon, PAGES_PER_SPEC, type RankingsFetcher } from "./crawler.js";
import { SPECS } from "./specs.js";

describe("percentile", () => {
  it("interpolates between neighbours", () => {
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
    expect(percentile([0, 100], 0.95)).toBe(95);
  });

  it("handles degenerate inputs", () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([7], 0.95)).toBe(7);
  });

  it("puts p95 at or below the maximum", () => {
    const values = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(percentile(values, 0.95)).toBeLessThan(200);
    expect(percentile(values, 0.95)).toBeGreaterThan(percentile(values, 0.5));
  });
});

const parse = (
  specSlug: string,
  encounterId: number,
  keyLevel: number,
  amount: number
): Parse => ({ classSlug: "Mage", specSlug, role: "DPS", encounterId, keyLevel, amount });

describe("aggregate", () => {
  /**
   * The whole point of normalizing: a spec logged only in the high-damage
   * dungeon must not out-rank an identically-performing spec logged only in the
   * low-damage one.
   */
  it("does not reward a spec for the dungeons it happened to be logged in", () => {
    const parses: Parse[] = [];
    // Dungeon 1 pays double what dungeon 2 does.
    for (let i = 0; i < 20; i++) {
      parses.push(parse("Fire", 1, 15, 200 + i));
      parses.push(parse("Frost", 2, 15, 100 + i / 2));
      // Filler so each bucket has a meaningful all-spec median.
      parses.push(parse("Arcane", 1, 15, 200 + i));
      parses.push(parse("Arcane", 2, 15, 100 + i / 2));
    }

    const rows = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    const fire = rows.find((r) => r.specSlug === "Fire")!;
    const frost = rows.find((r) => r.specSlug === "Frost")!;
    expect(fire.median).toBeCloseTo(frost.median, 5);
  });

  it("ranks a genuinely stronger spec above a weaker one", () => {
    const parses: Parse[] = [];
    for (let i = 0; i < 20; i++) {
      parses.push(parse("Fire", 1, 15, 300 + i));
      parses.push(parse("Frost", 1, 15, 200 + i));
    }
    const rows = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    const fire = rows.find((r) => r.specSlug === "Fire")!;
    const frost = rows.find((r) => r.specSlug === "Frost")!;
    expect(fire.median).toBeGreaterThan(frost.median);
  });

  it("reports pooled values in real throughput units", () => {
    const parses = Array.from({ length: 40 }, (_, i) => parse("Fire", 1, 15, 250_000 + i));
    const [pooled] = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    expect(pooled!.median).toBeGreaterThan(200_000);
    expect(pooled!.median).toBeLessThan(300_000);
  });

  it("keeps real cross-dungeon pay differences in per-dungeon rows", () => {
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 15, 400)),
      ...Array.from({ length: 10 }, () => parse("Fire", 2, 15, 100)),
    ];
    const detail = aggregate(parses, [15]).filter((r) => r.encounterId !== 0);
    expect(detail.find((r) => r.encounterId === 1)!.median).toBe(400);
    expect(detail.find((r) => r.encounterId === 2)!.median).toBe(100);
  });

  it("corrects per-dungeon rows for key mix within the dungeon", () => {
    // Same raw output, but Frost delivers it at key 10 where the field does
    // half of what it does at 15 — Frost is beating its field harder and a
    // dungeon-scoped ranking must reflect that, not the raw tie.
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 15, 300)),
      ...Array.from({ length: 10 }, () => parse("Frost", 1, 10, 300)),
      ...Array.from({ length: 10 }, () => parse("Arcane", 1, 15, 300)),
      ...Array.from({ length: 10 }, () => parse("Arcane", 1, 10, 150)),
    ];
    const detail = aggregate(parses, [10]).filter((r) => r.encounterId === 1);
    const fire = detail.find((r) => r.specSlug === "Fire")!;
    const frost = detail.find((r) => r.specSlug === "Frost")!;
    expect(frost.median).toBeGreaterThan(fire.median);
  });

  it("excludes parses below the scope's keystone floor", () => {
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 18, 300)),
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 12, 100)),
    ];
    const [pooled] = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    expect(pooled!.parses).toBe(10);
  });

  it("normalizes healers against healers, not against the damage field", () => {
    const parses: Parse[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        classSlug: "Druid", specSlug: "Restoration", role: "HEALER" as const,
        encounterId: 1, keyLevel: 15, amount: 150_000 + i,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        classSlug: "Mage", specSlug: "Fire", role: "DPS" as const,
        encounterId: 1, keyLevel: 15, amount: 400_000 + i,
      })),
    ];
    const [healer] = aggregate(parses, [15]).filter(
      (r) => r.encounterId === 0 && r.role === "HEALER"
    );
    expect(healer!.metric).toBe("hps");
    expect(healer!.median).toBeGreaterThan(140_000);
    expect(healer!.median).toBeLessThan(160_000);
  });
});

describe("crawlDungeon", () => {
  const row = (cls: string, spec: string, amount: number, key = 15) => ({
    class: cls, spec, amount, bracketData: key,
  });

  it("samples every spec at the same depth so rarity cannot skew the skim", async () => {
    // The regression this guards: per-class sampling let a spec rare within its
    // class (Fury among Warriors) contribute only its elite tail and out-rank
    // genuinely stronger specs. Per-spec queries give all 40 the same depth.
    const specsAsked = new Set<string>();
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName) => {
      specsAsked.add(`${className}/${specName}`);
      return { dps: { rankings: [row(className, specName, 100)] } };
    };
    const crawl = await crawlDungeon(fetchPage, 1, "Test");
    expect(specsAsked.size).toBe(40);
    expect(specsAsked.has("Warrior/Fury")).toBe(true);
    expect(specsAsked.has("Rogue/Assassination")).toBe(true);
    // One short page per spec ends it: exactly one request each.
    expect(crawl.requests).toBe(40);
  });

  it("requests hps for healer specs and dps for everyone else", async () => {
    const metricFor = new Map<string, string>();
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName, metric) => {
      metricFor.set(`${className}/${specName}`, metric);
      return {};
    };
    await crawlDungeon(fetchPage, 1, "Test");
    expect(metricFor.get("Priest/Holy")).toBe("hps");
    expect(metricFor.get("Shaman/Restoration")).toBe("hps");
    expect(metricFor.get("Shaman/Elemental")).toBe("dps");
    expect(metricFor.get("Warrior/Fury")).toBe("dps");
  });

  it("pages a full spec to the sample depth and no further", async () => {
    const pagesSeen: number[] = [];
    const fetchPage: RankingsFetcher = async (_e, page, className, specName) => {
      if (specName === "Fire" && className === "Mage") pagesSeen.push(page);
      return { dps: { rankings: Array.from({ length: 100 }, () => row(className, specName, 100)), hasMorePages: true } };
    };
    await crawlDungeon(fetchPage, 1, "Test");
    expect(pagesSeen).toEqual([...Array(PAGES_PER_SPEC)].map((_, i) => i + 1));
  });

  it("keeps healer amounts from the hps list only", async () => {
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName, metric) => {
      if (className === "Druid" && specName === "Restoration") {
        // A healer response only carries the hps list.
        expect(metric).toBe("hps");
        return { hps: { rankings: [row("Druid", "Restoration", 180)] } };
      }
      return { dps: { rankings: [] } };
    };
    const { parses } = await crawlDungeon(fetchPage, 1, "Test");
    expect(parses).toHaveLength(1);
    expect(parses[0]!.amount).toBe(180);
    expect(parses[0]!.role).toBe("HEALER");
  });

  it("reports the keystone levels seen in the sample", async () => {
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName) => ({
      dps: { rankings: specName === "Fire" && className === "Mage"
        ? [row("Mage", "Fire", 100, 16), row("Mage", "Fire", 90, 12)] : [] },
    });
    const crawl = await crawlDungeon(fetchPage, 1, "Test");
    expect(crawl.keyLevels).toEqual([12, 16]);
  });
});

describe("spec roster", () => {
  it("covers all 40 specs with unique keys", () => {
    expect(SPECS).toHaveLength(40);
    expect(new Set(SPECS.map((s) => `${s.classSlug}/${s.specSlug}`)).size).toBe(40);
  });

  it("has the expected role split", () => {
    const count = (role: string) => SPECS.filter((s) => s.role === role).length;
    expect(count("TANK")).toBe(6);
    expect(count("HEALER")).toBe(7);
    expect(count("DPS")).toBe(27);
  });
});
