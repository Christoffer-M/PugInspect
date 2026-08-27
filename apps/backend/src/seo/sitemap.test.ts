import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderSitemapXml } from "./sitemap.js";
import { getSitemapCharacters } from "../db/persistence.js";
import { getMplusStatsMeta } from "../db/mplusStats.js";

vi.mock("../db/persistence.js", () => ({
  getSitemapCharacters: vi.fn(),
}));

vi.mock("../db/mplusStats.js", () => ({
  getMplusStatsMeta: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getSitemapCharacters).mockReset();
  vi.mocked(getMplusStatsMeta).mockReset();
});

// NOTE: renderSitemapXml caches its output at module level, so the DB-driven
// assertions all run against the first render.
describe("renderSitemapXml", () => {
  it("lists static pages and character pages with lastmod dates", async () => {
    vi.mocked(getSitemapCharacters).mockResolvedValue([
      {
        region: "eu",
        realm: "tarren-mill",
        name: "pugsley",
        updatedAt: new Date("2026-08-01T12:34:56Z"),
      },
      {
        region: "us",
        realm: "area-52",
        name: "dogboy",
        updatedAt: new Date("2026-07-15T00:00:00Z"),
      },
    ]);

    vi.mocked(getMplusStatsMeta).mockResolvedValue({
      zoneId: 45,
      keyLevels: [10],
      totalParses: 1000,
      dungeons: [],
      requests: 330,
      refreshedAt: new Date("2026-08-26T09:00:00Z"),
    });

    const xml = await renderSitemapXml();

    expect(xml).toContain("<loc>https://puginspect.com/</loc>");
    // The rankings page dates itself from the crawl, not the hardcoded fallback.
    expect(xml).toContain(
      "<loc>https://puginspect.com/mythic-plus</loc>\n    <lastmod>2026-08-26</lastmod>"
    );
    expect(xml).toContain("<loc>https://puginspect.com/privacy-policy</loc>");
    expect(xml).not.toContain("/stats");
    expect(xml).toContain("<loc>https://puginspect.com/eu/tarren-mill/pugsley</loc>");
    expect(xml).toContain("<loc>https://puginspect.com/us/area-52/dogboy</loc>");
    expect(xml).toContain("<lastmod>2026-08-01</lastmod>");
    expect(xml).toContain("<lastmod>2026-07-15</lastmod>");
  });

  it("serves from cache on subsequent calls without re-querying", async () => {
    const xml = await renderSitemapXml();

    expect(xml).toContain("pugsley");
    expect(getSitemapCharacters).not.toHaveBeenCalled();
  });
});
