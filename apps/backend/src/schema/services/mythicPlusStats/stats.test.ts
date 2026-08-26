import { describe, expect, it } from "vitest";
import { aggregate, percentile, type Parse } from "./stats.js";
import { crawlDungeon, PAGES_PER_SPEC, type RankingsFetcher } from "./crawler.js";
import { SPECS } from "./specs.js";
import { HERO_TALENTS } from "../../../generated/heroTalents.js";

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
): Parse => ({ classSlug: "Mage", specSlug, role: "DPS", encounterId, keyLevel, amount, metric: "dps" });

describe("aggregate", () => {
  /**
   * The normalization that used to hide this was removed deliberately: the page
   * now reports where specs actually are. A spec logged only in the generous
   * dungeon DOES read higher, and `medianKey` / the dungeon rows are what let a
   * reader see why.
   */
  it("reports raw throughput, including the dungeon mix a spec was logged in", () => {
    const parses: Parse[] = [];
    // Dungeon 1 pays double what dungeon 2 does.
    for (let i = 0; i < 20; i++) {
      parses.push(parse("Fire", 1, 15, 200 + i));
      parses.push(parse("Frost", 2, 15, 100 + i / 2));
    }

    const rows = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    const fire = rows.find((r) => r.specSlug === "Fire")!;
    const frost = rows.find((r) => r.specSlug === "Frost")!;
    expect(fire.median).toBeCloseTo(209.5, 5);
    expect(frost.median).toBeCloseTo(104.75, 5);
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

  it("excludes parses below the scope's keystone floor", () => {
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 18, 300)),
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 12, 100)),
    ];
    const [pooled] = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    expect(pooled!.parses).toBe(10);
  });

  it("keeps max as a raw parse someone can find on WarcraftLogs", () => {
    // The displayed max is the single best parse, unchanged: 300.
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 10, 300)),
      ...Array.from({ length: 10 }, () => parse("Arcane", 1, 10, 150)),
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 15, 280)),
      ...Array.from({ length: 10 }, () => parse("Arcane", 1, 15, 280)),
    ];
    const fire = aggregate(parses, [10]).find(
      (r) => r.encounterId === 0 && r.specSlug === "Fire"
    )!;
    expect(fire.max).toBe(300);
  });

  it("stamps max with the key level of the run that produced it", () => {
    const parses = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 14, 250)),
      // The single best parse happens at key 18, well above the typical key.
      parse("Fire", 1, 18, 400),
      ...Array.from({ length: 10 }, () => parse("Arcane", 1, 14, 250)),
    ];
    const fire = aggregate(parses, [14]).find(
      (r) => r.encounterId === 0 && r.specSlug === "Fire"
    )!;
    expect(fire.max).toBe(400);
    expect(fire.maxKey).toBe(18);
    expect(fire.medianKey).toBe(14);
  });

  it("carries the best parse's report reference for linking", () => {
    const parses: Parse[] = [
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 14, 250)),
      { ...parse("Fire", 1, 18, 400), reportCode: "AbCd1234", fightId: 7 },
    ];
    const fire = aggregate(parses, [14]).find(
      (r) => r.encounterId === 0 && r.specSlug === "Fire"
    )!;
    expect(fire.maxReportCode).toBe("AbCd1234");
    expect(fire.maxFightId).toBe(7);
  });

  it("ranks healers on healing, never against the damage field", () => {
    const parses: Parse[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        classSlug: "Druid", specSlug: "Restoration", role: "HEALER" as const,
        encounterId: 1, keyLevel: 15, amount: 150_000 + i, metric: "hps" as const,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        classSlug: "Mage", specSlug: "Fire", role: "DPS" as const,
        encounterId: 1, keyLevel: 15, amount: 400_000 + i, metric: "dps" as const,
      })),
    ];
    const [healer] = aggregate(parses, [15]).filter(
      (r) => r.encounterId === 0 && r.role === "HEALER"
    );
    expect(healer!.metric).toBe("hps");
    expect(healer!.median).toBeGreaterThan(140_000);
    expect(healer!.median).toBeLessThan(160_000);
  });
  it("keeps median <= p95 <= max on every row", () => {
    // The bug that killed normalization: p95 was a rescaled counterfactual and
    // routinely landed above a spec's own best logged parse.
    const parses = [
      ...Array.from({ length: 20 }, (_, i) => parse("Fire", 1, 10, 150 + i)),
      ...Array.from({ length: 80 }, (_, i) => parse("Frost", 1, 20, 300 + i)),
      ...Array.from({ length: 60 }, (_, i) => parse("Arcane", 1, 10, 100 + i)),
    ];
    const rows = aggregate(parses, [10]);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.median).toBeLessThanOrEqual(r.p95);
      expect(r.p95).toBeLessThanOrEqual(r.max);
    }
  });
});

describe("hero talent split", () => {
  const heroParse = (specSlug: string, hero: string | undefined, amount: number): Parse => ({
    ...parse(specSlug, 1, 15, amount),
    heroTalent: hero,
  });

  it("gives each tree its own rows and leaves untagged parses out of them", () => {
    const parses: Parse[] = [];
    for (let i = 0; i < 10; i++) {
      parses.push(heroParse("Fire", "Sunfury", 300 + i));
      parses.push(heroParse("Fire", "Frostfire", 100 + i));
      // No combatant info in the log: counts for the spec, for no tree.
      parses.push(heroParse("Fire", undefined, 200 + i));
    }

    const pooled = aggregate(parses, [15]).filter((r) => r.encounterId === 0);
    const spec = pooled.find((r) => r.heroTalent === "")!;
    const sunfury = pooled.find((r) => r.heroTalent === "Sunfury")!;
    const frostfire = pooled.find((r) => r.heroTalent === "Frostfire")!;

    expect(spec.parses).toBe(30);
    expect(sunfury.parses).toBe(10);
    expect(frostfire.parses).toBe(10);
    // The whole point of the split: the trees separate, and neither equals the
    // spec's own median, which the untagged parses sit in the middle of.
    expect(sunfury.median).toBeGreaterThan(spec.median);
    expect(frostfire.median).toBeLessThan(spec.median);
    // Trees do not sum to the spec — untagged parses belong to no tree.
    expect(sunfury.parses + frostfire.parses).toBeLessThan(spec.parses);
  });

  it("splits each tree per dungeon too, so the dungeon filter still works", () => {
    const parses = [
      { ...heroParse("Fire", "Sunfury", 300), encounterId: 1 },
      { ...heroParse("Fire", "Sunfury", 310), encounterId: 2 },
    ];
    const rows = aggregate(parses, [15]).filter((r) => r.heroTalent === "Sunfury");
    expect(rows.map((r) => r.encounterId).sort()).toEqual([0, 1, 2]);
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

  it("reads the hero talent tree off a ranking row's talents", async () => {
    // Ids come from the generated map rather than being hardcoded — they are
    // re-issued each expansion, and this should track the map, not a snapshot.
    const [id, tree] = Object.entries(HERO_TALENTS)[0]!;
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName) => ({
      dps: {
        rankings: [
          { ...row(className, specName, 100), talents: [{ talentID: Number(id) }, { talentID: 1 }] },
          // Log without combatant info: still a parse, just no tree.
          row(className, specName, 90),
        ],
      },
    });
    const crawl = await crawlDungeon(fetchPage, 1, "Test");
    expect(Object.keys(HERO_TALENTS).length).toBeGreaterThan(50);
    expect(crawl.parses.filter((p) => p.heroTalent === tree).length).toBe(40);
    expect(crawl.parses.filter((p) => p.heroTalent === undefined).length).toBe(40);
  });

  it("requests both metrics for healer specs and dps for everyone else", async () => {
    const metricFor = new Map<string, string>();
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName, metric) => {
      metricFor.set(`${className}/${specName}`, metric);
      return {};
    };
    await crawlDungeon(fetchPage, 1, "Test");
    expect(metricFor.get("Priest/Holy")).toBe("both");
    expect(metricFor.get("Shaman/Restoration")).toBe("both");
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

  it("tags healer parses with the metric of the list they came from", async () => {
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName, metric) => {
      if (className === "Druid" && specName === "Restoration") {
        expect(metric).toBe("both");
        return {
          hps: { rankings: [row("Druid", "Restoration", 180)] },
          dps: { rankings: [row("Druid", "Restoration", 55)] },
        };
      }
      return { dps: { rankings: [] } };
    };
    const { parses } = await crawlDungeon(fetchPage, 1, "Test");
    expect(parses).toHaveLength(2);
    expect(parses.find((p) => p.metric === "hps")!.amount).toBe(180);
    expect(parses.find((p) => p.metric === "dps")!.amount).toBe(55);
    expect(parses.every((p) => p.role === "HEALER")).toBe(true);
  });

  it("isolates a failing spec instead of aborting the dungeon crawl", async () => {
    // The roster is hand-maintained; one bad slug must not stall every hourly
    // refresh forever.
    const fetchPage: RankingsFetcher = async (_e, _p, className, specName) => {
      if (className === "Mage" && specName === "Fire") throw new Error("WCL GraphQL error: boom");
      return { dps: { rankings: [row(className, specName, 100)] } };
    };
    const crawl = await crawlDungeon(fetchPage, 1, "Test");
    expect(crawl.parses.some((p) => p.specSlug === "Fire" && p.classSlug === "Mage")).toBe(false);
    expect(crawl.parses.length).toBeGreaterThan(30);
  });

  it("lets a rate-limit error abort the whole crawl", async () => {
    const rateLimited = Object.assign(new Error("rate limited"), {
      extensions: { code: "RATE_LIMITED" },
    });
    const fetchPage: RankingsFetcher = async () => {
      throw rateLimited;
    };
    await expect(crawlDungeon(fetchPage, 1, "Test")).rejects.toThrow("rate limited");
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

describe("healer damage", () => {
  it("ranks healer dps against other healers, never the damage field", () => {
    const healerDps = (spec: string, cls: string, amount: number): Parse => ({
      classSlug: cls, specSlug: spec, role: "HEALER", encounterId: 1, keyLevel: 15,
      amount, metric: "dps",
    });
    const parses: Parse[] = [
      // The DPS field does 300k — healer damage must be ranked in its own
      // group, or these 50k/70k healers would sit at the bottom of the table.
      ...Array.from({ length: 10 }, () => parse("Fire", 1, 15, 300_000)),
      ...Array.from({ length: 10 }, () => healerDps("Restoration", "Druid", 50_000)),
      ...Array.from({ length: 10 }, () => healerDps("Holy", "Paladin", 70_000)),
    ];
    const rows = aggregate(parses, [15]).filter(
      (r) => r.encounterId === 0 && r.role === "HEALER" && r.metric === "dps"
    );
    const holy = rows.find((r) => r.specSlug === "Holy")!;
    const resto = rows.find((r) => r.specSlug === "Restoration")!;
    // Real units from the healer field's own median (60k), untouched by the 300k DPS group.
    expect(holy.median).toBeGreaterThan(resto.median);
    expect(holy.median).toBeLessThan(80_000);
    expect(resto.median).toBeGreaterThan(40_000);
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
