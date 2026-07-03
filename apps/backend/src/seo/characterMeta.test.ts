import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderCharacterPageHtml } from "./characterMeta.js";
import { getCharacterMetaSnapshot } from "../db/persistence.js";

vi.mock("../db/persistence.js", () => ({
  getCharacterMetaSnapshot: vi.fn(),
}));

const TEMPLATE = `<!doctype html>
<html>
<head>
<!--seo:start--><title>Default Title</title><meta name="description" content="default" /><!--seo:end-->
</head>
<body><div id="root"></div></body>
</html>`;

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, text: async () => TEMPLATE });
  vi.mocked(getCharacterMetaSnapshot).mockReset();
  vi.mocked(getCharacterMetaSnapshot).mockResolvedValue(null);
});

// NOTE: characterMeta caches the fetched index.html at module level, so test
// order matters: the fetch-failure case must run before any successful fetch.
describe("renderCharacterPageHtml", () => {
  it("returns null for invalid input without touching the DB", async () => {
    expect(await renderCharacterPageHtml("zz", "kazzak", "pugsley")).toBeNull();
    expect(await renderCharacterPageHtml("eu", "kazzak", "  ")).toBeNull();
    expect(await renderCharacterPageHtml("eu", "kazzak", "a".repeat(51))).toBeNull();
    expect(getCharacterMetaSnapshot).not.toHaveBeenCalled();
  });

  it("serves a minimal fallback shell when index.html cannot be fetched", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"));

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    expect(html).not.toBeNull();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Pugsley-Kazzak | PugInspect</title>");
    expect(html).toContain("<body></body>");
  });

  it("injects meta tags into the template between the seo markers", async () => {
    const html = await renderCharacterPageHtml("eu", "Tarren Mill", "Pugsley");

    expect(html).toContain("<title>Pugsley-Tarren Mill | PugInspect</title>");
    expect(html).not.toContain("Default Title");
    expect(html).toContain(
      'content="https://puginspect.com/eu/tarren-mill/pugsley"'
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://puginspect.com/card/eu/tarren-mill/pugsley" />'
    );
    // Template body survives injection
    expect(html).toContain('<div id="root"></div>');
  });

  it("escapes HTML in user-supplied values", async () => {
    const html = await renderCharacterPageHtml("eu", "kazzak", 'pug"<b>sley');

    expect(html).not.toContain('"<b>');
    expect(html).toContain("Pug&quot;&lt;b&gt;sley");
  });

  it("builds a stat-rich description from the DB snapshot", async () => {
    vi.mocked(getCharacterMetaSnapshot).mockResolvedValue({
      name: "pugsley",
      realm: "kazzak",
      class: "Shaman",
      specialization: "Enhancement",
      race: "Orc",
      itemLevel: 678.4,
      mythicPlusScore: 2801.7,
    });

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    expect(html).toContain(
      "Pugsley on Kazzak (EU) — Orc Enhancement Shaman, ilvl 678, M+ score 2802."
    );
    expect(getCharacterMetaSnapshot).toHaveBeenCalledWith({
      region: "eu",
      realm: "kazzak",
      name: "pugsley",
    });
  });
});
