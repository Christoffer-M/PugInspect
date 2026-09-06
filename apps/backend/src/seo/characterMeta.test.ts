import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderCharacterPageHtml } from "./characterMeta.js";
import { getCharacterSeoSnapshot, type CharacterSeoSnapshot } from "../db/persistence.js";
import { DEFAULT_RAID } from "../generated/seasonConfig.js";

vi.mock("../db/persistence.js", () => ({
  getCharacterSeoSnapshot: vi.fn(),
}));

const TEMPLATE = `<!doctype html>
<html>
<head>
<!--seo:start--><title>Default Title</title><meta name="description" content="default" /><!--seo:end-->
</head>
<body><!--body:start--><div id="app"></div><!--body:end--></body>
</html>`;

function snapshot(overrides: Partial<CharacterSeoSnapshot> = {}): CharacterSeoSnapshot {
  return {
    name: "pugsley",
    realm: "kazzak",
    region: "eu",
    class: "Shaman",
    specialization: "Enhancement",
    race: "Orc",
    thumbnailUrl: null,
    itemLevel: 678.4,
    mythicPlusScore: 2801.7,
    mythicPlusColor: null,
    topKeyLevel: 14,
    raidProgression: {
      [DEFAULT_RAID]: {
        summary: "4/8 M",
        expansion_id: 11,
        total_bosses: 8,
        normal_bosses_killed: 8,
        heroic_bosses_killed: 8,
        mythic_bosses_killed: 4,
      },
    },
    ...overrides,
  };
}

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, text: async () => TEMPLATE });
  vi.mocked(getCharacterSeoSnapshot).mockReset();
  vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(null);
});

// NOTE: characterMeta caches the fetched index.html at module level, so test
// order matters: the fetch-failure case must run before any successful fetch.
describe("renderCharacterPageHtml", () => {
  it("returns null for invalid input without touching the DB", async () => {
    expect(await renderCharacterPageHtml("zz", "kazzak", "pugsley")).toBeNull();
    expect(await renderCharacterPageHtml("eu", "kazzak", "  ")).toBeNull();
    expect(await renderCharacterPageHtml("eu", "kazzak", "a".repeat(51))).toBeNull();
    expect(getCharacterSeoSnapshot).not.toHaveBeenCalled();
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
    // With no snapshot there are no facts to state, so the empty
    // container survives untouched.
    expect(html).toContain('<div id="app"></div>');
  });

  it("escapes HTML in user-supplied values", async () => {
    const html = await renderCharacterPageHtml("eu", "kazzak", 'pug"<b>sley');

    expect(html).not.toContain('"<b>');
    expect(html).toContain("Pug&quot;&lt;b&gt;sley");
  });

  it("builds a stat-rich description from the DB snapshot", async () => {
    vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(snapshot());

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    expect(html).toContain(
      "Pugsley on Kazzak (EU) — Orc Enhancement Shaman, ilvl 678, M+ score 2802."
    );
    expect(getCharacterSeoSnapshot).toHaveBeenCalledWith({
      region: "eu",
      realm: "kazzak",
      name: "pugsley",
    });
  });

  it("injects a factual text summary into the body for crawlers", async () => {
    vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(snapshot());

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    // The summary lives inside #app so createRoot replaces it on mount.
    expect(html).toContain('<div id="app">');
    expect(html).toContain("<h1>Pugsley-Kazzak (EU)</h1>");
    expect(html).toContain("Pugsley is an Orc Enhancement Shaman on Kazzak (EU).");
    expect(html).toContain("<dt>Item level</dt>\n      <dd>678</dd>");
    expect(html).toContain("<dt>Mythic+ score</dt>\n      <dd>2802</dd>");
    expect(html).toContain("<dt>Best Mythic+ key</dt>\n      <dd>+14</dd>");
    // Mythic kills outrank the heroic clear, matching the character page.
    expect(html).toContain("4/8 Mythic in");
    // A consonant-initial race takes "a".
    vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(snapshot({ race: "Troll" }));
    expect(await renderCharacterPageHtml("eu", "kazzak", "pugsley")).toContain(
      "Pugsley is a Troll Enhancement Shaman"
    );
    expect(html).not.toContain("<!--body:start-->");
  });

  it("omits facts the snapshot doesn't have", async () => {
    vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(
      snapshot({ itemLevel: null, mythicPlusScore: null, topKeyLevel: null, raidProgression: null })
    );

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    expect(html).toContain("<h1>Pugsley-Kazzak (EU)</h1>");
    expect(html).not.toContain("<dl>");
    expect(html).not.toContain("Item level");
  });

  it("escapes snapshot values in the body summary", async () => {
    vi.mocked(getCharacterSeoSnapshot).mockResolvedValue(
      snapshot({ specialization: '<script>alert(1)</script>' })
    );

    const html = await renderCharacterPageHtml("eu", "kazzak", "pugsley");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
