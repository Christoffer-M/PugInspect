import { test, expect, type Page } from "@playwright/test";

// GraphQL is mocked at the browser boundary, same as stats.spec.ts — this suite
// owns rendering and interaction of /mythic-plus; the crawl and the percentile
// maths are covered by the backend vitest suite.

const dungeons = [
  { encounterId: 1, name: "Altar of Fangs" },
  { encounterId: 2, name: "Kings' Rest" },
];

const spec = (
  specName: string,
  className: string,
  classSlug: string,
  specSlug: string,
  role: string,
  median: number,
  parses: number
) => ({
  classSlug,
  specSlug,
  className,
  specName,
  role,
  metric: role === "HEALER" ? "hps" : "dps",
  parses,
  median,
  p95: median * 1.15,
  max: median * 1.35,
  medianKey: 12,
  maxKey: 17,
  dungeons: dungeons.map((d, i) => ({
    encounterId: d.encounterId,
    parses: Math.round(parses / 2),
    median: median * (i === 0 ? 1.1 : 0.85),
    p95: median * 1.2,
    max: median * 1.3,
    medianKey: 11 + i,
    maxKey: 16,
  })),
});

const stats = {
  zoneId: 55,
  refreshedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  keyFloor: 10,
  keyLevels: [10, 11, 12, 13, 14, 15, 16, 17],
  totalParses: 83585,
  minParsesToRank: 50,
  sampleDepth: 1000,
  minKeyLevel: 10,
  dungeons,
  specs: [
    spec("Elemental", "Shaman", "Shaman", "Elemental", "DPS", 249_200, 799),
    spec("Arcane", "Mage", "Mage", "Arcane", "DPS", 248_900, 1317),
    spec("Devourer", "Demon Hunter", "DemonHunter", "Devourer", "DPS", 120_000, 7),
    spec("Holy", "Priest", "Priest", "Holy", "HEALER", 151_700, 139),
    spec("Blood", "Death Knight", "DeathKnight", "Blood", "TANK", 144_100, 1389),
  ],
};

// In Kings' Rest (encounterId 2) Arcane out-performs Elemental, reversing the
// pooled order — this is what the dungeon selector must surface.
stats.specs[1]!.dungeons[1]!.median = 297_500;
// Arcane also holds the single best parse while trailing on median — sorting by
// Max must promote it.
stats.specs[1]!.max = 400_000;

const mockGraphql = (page: Page, payload: unknown) =>
  page.route("**/graphql", async (route) => {
    const { query } = route.request().postDataJSON() as { query: string };
    const body = query.includes("query MythicPlusSpecStats")
      ? { data: { mythicPlusSpecStats: payload } }
      : { data: { character: null } };
    await route.fulfill({ json: body });
  });

test("ranks specs by throughput with provenance", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  await expect(page.getByRole("heading", { name: "Mythic+ Spec Meta" })).toBeVisible();

  // Provenance strip is how the page earns trust — it must show real numbers.
  await expect(page.getByText("83,585")).toBeVisible();
  // Headline range is the parse-weighted typical band, not the outlier span.
  await expect(page.getByText("11–12")).toBeVisible();
  await expect(page.getByText("runs from +10 to +17 seen")).toBeVisible();
  await expect(page.getByText("8m ago")).toBeVisible();
  await expect(page.getByText("Warcraft Logs", { exact: true })).toBeVisible();

  // Real throughput, not an index.
  await expect(page.getByText("249.2k")).toBeVisible();
  await expect(page.getByText("248.9k")).toBeVisible();

  // Highest median first.
  const names = await page.locator('[class*="specName"]').allInnerTexts();
  expect(names.slice(0, 2)).toEqual(["Elemental", "Arcane"]);
});

test("a thinly-logged spec is shown but not ranked", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  await expect(page.getByText("Needs 50 parses to rank.", { exact: false })).toBeVisible();
  // Explicitly not hidden — the spec still has a row.
  await expect(page.getByText("Devourer")).toBeVisible();
});

test("expanding a spec reveals its per-dungeon split", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  await expect(page.getByText("Per dungeon", { exact: false })).toBeHidden();
  await page.getByRole("button", { expanded: false }).first().click();

  await expect(page.getByText("Per dungeon · DPS · fastest runs")).toBeVisible();
  const detail = page.locator('[class*="detailGrid"]');
  await expect(detail.getByText("Altar of Fangs")).toBeVisible();
  await expect(detail.getByText("Kings' Rest")).toBeVisible();
});

test("role tabs switch the ranked population and the metric", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  await page.getByRole("tab", { name: /Healer/ }).click();
  await expect(page.getByText("151.7k")).toBeVisible();
  await expect(page.getByText("Elemental")).toBeHidden();

  await page.getByRole("tab", { name: /Tank/ }).click();
  await expect(page.getByText("144.1k")).toBeVisible();
});

test("selecting a dungeon re-scopes and re-ranks the table", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  // Pooled: Elemental leads.
  await expect(page.locator('[class*="specName"]').first()).toHaveText("Elemental");

  await page.getByRole("textbox", { name: "Dungeon" }).click();
  await page.getByRole("option", { name: "Kings' Rest" }).click();

  // Dungeon-scoped: Arcane leads with its Kings' Rest median.
  await expect(page.locator('[class*="specName"]').first()).toHaveText("Arcane");
  await expect(page.getByText("297.5k")).toBeVisible();
  // Rows are not expandable in the dungeon view — the split would be redundant.
  await expect(page.getByRole("button", { expanded: false })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Dungeon" }).click();
  await page.getByRole("option", { name: "All dungeons" }).click();
  await expect(page.locator('[class*="specName"]').first()).toHaveText("Elemental");
});

test("stat columns sort the table and take the headline emphasis", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/mythic-plus");

  await expect(page.locator('[class*="specName"]').first()).toHaveText("Elemental");

  const maxHeader = page.locator('[class*="headSort"]', { hasText: "Max" });
  await maxHeader.click();
  await expect(maxHeader).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[class*="specName"]').first()).toHaveText("Arcane");
  await expect(page.getByText("Rows sorted by max", { exact: false })).toBeVisible();
  // The emphasized (headline-styled) number in the top row is now the max value.
  await expect(
    page.locator('[class*="rowWrap"]').first().locator('[class*="statActive"]')
  ).toHaveText("400.0k");

  // The expanded per-dungeon panel decomposes the stat the table is sorted by:
  // under a Max sort it must show each dungeon's max, not its median.
  await page.getByRole("button", { expanded: false }).first().click();
  await expect(page.getByText("1,317 parses · max DPS per run")).toBeVisible();
  // Arcane's fixture dungeon max = 248,900 × 1.3 = 323.6k (median would be 273.8k).
  await expect(page.locator('[class*="detailValue"]').first()).toHaveText("323.6k");
  // …and the key badge is the max run's key, not the typical key.
  await expect(page.locator('[class*="detailKey"]').first()).toHaveText("+16");

  await page.locator('[class*="headSort"]', { hasText: "Median" }).click();
  await expect(page.locator('[class*="specName"]').first()).toHaveText("Elemental");
});

test("falls back to an explanatory empty state when there is no data", async ({ page }) => {
  await mockGraphql(page, null);
  await page.goto("/mythic-plus");

  await expect(page.getByText("No spec data yet")).toBeVisible();
});

test("the footer links to the spec meta page", async ({ page }) => {
  await mockGraphql(page, stats);
  await page.goto("/stats");

  await page.getByRole("link", { name: "Spec Meta" }).click();
  await expect(page).toHaveURL(/\/mythic-plus/);
});
