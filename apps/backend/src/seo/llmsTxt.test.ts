import { describe, it, expect } from "vitest";
import { renderLlmsTxt } from "./llmsTxt.js";
import {
  CURRENT_DUNGEONS,
  DEFAULT_MYTHIC_PLUS_SEASON,
  MYTHIC_PLUS_SEASONS,
} from "../generated/seasonConfig.js";

describe("renderLlmsTxt", () => {
  it("opens with the llmstxt.org header and summary", () => {
    const txt = renderLlmsTxt();

    expect(txt.startsWith("# PugInspect\n")).toBe(true);
    expect(txt).toContain("\n> A free World of Warcraft character inspector.");
  });

  it("documents the character URL pattern and the realm slug rules", () => {
    const txt = renderLlmsTxt();

    expect(txt).toContain(
      "https://puginspect.com/{region}/{realm}/{character}",
    );
    expect(txt).toContain("https://puginspect.com/eu/tarren-mill/pugsley");
    // Apostrophes are dropped by normalizeRealm, not turned into hyphens.
    expect(txt).toContain("kiljaeden");
  });

  it("links the site's crawlable pages", () => {
    const txt = renderLlmsTxt();

    for (const path of [
      "/",
      "/mythic-plus",
      "/roster",
      "/privacy-policy",
      "/sitemap.xml",
    ]) {
      expect(txt).toContain(`(https://puginspect.com${path})`);
    }
  });

  it("lists only the regions the backend actually serves", () => {
    const txt = renderLlmsTxt();

    expect(txt).toContain("`eu`, `kr`, `tw`, `us`");
    // No CN: Blizzard's China API is a separate deployment we have no
    // credentials for, so a CN lookup 404s.
    expect(txt).not.toContain("`cn`");
  });

  it("takes its seasonal facts from the generated season config", () => {
    const txt = renderLlmsTxt();

    expect(txt).toContain(
      `Mythic+ season: ${MYTHIC_PLUS_SEASONS[DEFAULT_MYTHIC_PLUS_SEASON]?.displayName}`,
    );
    expect(txt).toContain(`${CURRENT_DUNGEONS.length} dungeons`);
    for (const dungeon of CURRENT_DUNGEONS) {
      expect(txt).toContain(dungeon.name);
    }
  });

  it("returns the same rendered string on repeat calls", () => {
    expect(renderLlmsTxt()).toBe(renderLlmsTxt());
  });
});
