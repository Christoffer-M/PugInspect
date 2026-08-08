import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderSitemapXml } from "./sitemap.js";
import { getSitemapCharacters } from "../db/persistence.js";

vi.mock("../db/persistence.js", () => ({
  getSitemapCharacters: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getSitemapCharacters).mockReset();
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

    const xml = await renderSitemapXml();

    expect(xml).toContain("<loc>https://puginspect.com/</loc>");
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
