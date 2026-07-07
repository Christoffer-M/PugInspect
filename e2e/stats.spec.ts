import { test, expect, type Page } from "@playwright/test";

// GraphQL is mocked at the browser boundary, same as smoke.spec.ts — this
// suite owns rendering and navigation of the /stats dashboard; the aggregate
// queries themselves are covered by the backend vitest suite.

const dayKey = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

const siteStats = {
  totalCharacters: 184027,
  newCharactersThisWeek: 6912,
  realmsTracked: 541,
  searchesToday: 12483,
  searchesYesterday: 11534,
  searchesPerDay: [
    { date: dayKey(1), count: 340 },
    { date: dayKey(0), count: 512 },
  ],
  regionBreakdown: [
    { region: "eu", count: 78400 },
    { region: "us", count: 71900 },
  ],
  classDistribution: [
    { class: "Warrior", count: 300 },
    { class: "Mage", count: 100 },
  ],
  recentSearches: [
    {
      name: "pugsley",
      realm: "kazzak",
      region: "eu",
      class: "Shaman",
      specialization: "Enhancement",
      // 3m ago with slack: renders "3m ago" for the whole 180–239s window,
      // immune to the seconds that pass between fixture load and render
      searchedAt: new Date(Date.now() - 185_000).toISOString(),
    },
  ],
  trendingCharacters: [
    { name: "pugsley", realm: "kazzak", region: "eu", class: "Shaman", searches: 2841 },
  ],
};

const emptyStats = {
  ...siteStats,
  totalCharacters: 0,
  newCharactersThisWeek: 0,
  realmsTracked: 0,
  searchesToday: 0,
  searchesYesterday: 0,
  searchesPerDay: [],
  regionBreakdown: [],
  classDistribution: [],
  recentSearches: [],
  trendingCharacters: [],
};

const mockGraphql = (page: Page, stats: typeof siteStats) =>
  page.route("**/graphql", async (route) => {
    const { query } = route.request().postDataJSON() as { query: string };
    const body = query.includes("query SiteStats")
      ? { data: { siteStats: stats } }
      : { data: { character: null } };
    await route.fulfill({ json: body });
  });

test("stats page renders all dashboard sections from live data", async ({ page }) => {
  await mockGraphql(page, siteStats);
  await page.goto("/stats");

  await expect(page.getByRole("heading", { name: "Stats", exact: true })).toBeVisible();

  // Hero cards
  await expect(page.getByText("184,027").first()).toBeVisible();
  await expect(page.getByText("12,483")).toBeVisible();
  await expect(page.getByText("6,912").first()).toBeVisible();
  await expect(page.getByText("541")).toBeVisible();
  // delta vs yesterday: (12483-11534)/11534 ≈ +8%
  await expect(page.getByText("+8%")).toBeVisible();

  // Chart shows today's bar value
  await expect(page.getByText("512")).toBeVisible();

  // Region breakdown with percentages (78400 / 150300)
  await expect(page.getByText("Europe (EU)")).toBeVisible();
  await expect(page.getByText("52.2%")).toBeVisible();
  await expect(page.getByText("Americas (US)")).toBeVisible();

  // Recent searches row
  await expect(page.getByText("3m ago")).toBeVisible();
  await expect(page.getByText("Kazzak · Enhancement Shaman")).toBeVisible();

  // Trending row
  await expect(page.getByText("2,841")).toBeVisible();
  await expect(page.getByText("01", { exact: true })).toBeVisible();

  // Class distribution (300 / 400 and 100 / 400)
  await expect(page.getByText("Warrior")).toBeVisible();
  await expect(page.getByText("75.0%")).toBeVisible();
  await expect(page.getByText("25.0%")).toBeVisible();
});

test("recent search entries link to the character page", async ({ page }) => {
  await mockGraphql(page, siteStats);
  await page.goto("/stats");

  await page.getByRole("link", { name: "Pugsley" }).first().click();
  await expect(page).toHaveURL(/\/eu\/kazzak\/pugsley/);
});

test("fresh deploy with no data renders empty states without crashing", async ({ page }) => {
  await mockGraphql(page, emptyStats);
  await page.goto("/stats");

  await expect(page.getByRole("heading", { name: "Stats", exact: true })).toBeVisible();
  await expect(
    page.getByText("No searches recorded yet — data starts accruing now.").first(),
  ).toBeVisible();
});

test("footer link navigates to the stats page", async ({ page }) => {
  await mockGraphql(page, siteStats);
  await page.goto("/");

  await page.getByRole("link", { name: "Stats", exact: true }).click();
  await expect(page).toHaveURL(/\/stats/);
  await expect(page.getByRole("heading", { name: "Stats", exact: true })).toBeVisible();
});
