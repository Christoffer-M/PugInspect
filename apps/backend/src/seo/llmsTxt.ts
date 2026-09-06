import { config } from "../config/index.js";
import {
  CURRENT_DUNGEONS,
  DEFAULT_MYTHIC_PLUS_SEASON,
  DEFAULT_RAID,
  MYTHIC_PLUS_SEASONS,
} from "../generated/seasonConfig.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";

/**
 * /llms.txt — the llmstxt.org index for answer engines (ChatGPT, Claude,
 * Perplexity, Gemini and the like). Those crawlers fetch a handful of URLs and
 * read the text they get back; this file is the one place that states, in
 * prose, what PugInspect is, what its URLs look like and where its data comes
 * from, so an assistant can answer about the site without executing the SPA.
 *
 * Everything seasonal here is read from the generated season config rather
 * than written out, so a new season/tier lands in this file with the config
 * regeneration and needs no SEASON-CONFIG site of its own.
 */

/** "the-venomous-abyss" → "The Venomous Abyss" */
function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** ["EU", "KR", "US"] → "EU, KR or US" */
function joinWithOr(parts: string[]): string {
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

function currentSeasonName(): string {
  return MYTHIC_PLUS_SEASONS[DEFAULT_MYTHIC_PLUS_SEASON]?.displayName ?? DEFAULT_MYTHIC_PLUS_SEASON;
}

function buildLlmsTxt(): string {
  const origin = config.publicOrigin;
  const regions = [...VALID_REGIONS].sort();
  const dungeons = CURRENT_DUNGEONS.map((d) => d.name).sort();

  return `# PugInspect

> A free World of Warcraft character inspector. Look up any character in the ${joinWithOr(
    regions.map((r) => r.toUpperCase())
  )} region and read their gear, item level, Raider.IO Mythic+ score, raid progression and Warcraft Logs parse percentiles on a single page.

PugInspect answers one question: how good is this character, really? It merges
three public data sources onto one page — Blizzard's Battle.net profile API
(gear, item level, class, specialization, race, guild, faction, achievements),
Raider.IO (Mythic+ score, best and recent dungeon runs, raid progression) and
Warcraft Logs (per-boss parse percentiles, DPS and HPS metrics, difficulty
splits) — so a guild officer vetting a pug applicant does not have to open
three sites and reconcile them by hand.

There is no account, no login, no cookies and no paywall. Every page is public
and addressable by URL, so a character can be looked up directly by
constructing its URL.

## Looking up a character

Character pages live at \`${origin}/{region}/{realm}/{character}\`:

- \`region\` is one of ${regions.map((r) => `\`${r}\``).join(", ")}.
- \`realm\` is the realm slug: lowercase, spaces replaced with hyphens and
  apostrophes dropped ("Tarren Mill" → \`tarren-mill\`, "Kil'jaeden" →
  \`kiljaeden\`).
- \`character\` is the character name, lowercased.

A character on Tarren Mill (EU) named Pugsley is therefore at
\`${origin}/eu/tarren-mill/pugsley\`. Names are case-insensitive; the site
normalizes them.

Every character page PugInspect has served is listed in the sitemap, which is
the authoritative index of character URLs — it is generated from the database,
not hand-maintained.

## Pages

- [Home](${origin}/): character search by region, realm and name.
- [Mythic+ spec meta](${origin}/mythic-plus): median, top 5% and best-parse DPS
  and HPS for all playable specs, computed from Warcraft Logs Mythic+ parses
  and refreshed hourly. Answers "which spec is actually performing this
  season", as opposed to which spec is popular.
- [Roster check](${origin}/roster): paste a raid roster export and inspect the
  whole team at once — item level, Raider.IO score, raid progress and log
  percentiles for every character on one screen. Produces a shareable link.
- [Privacy policy](${origin}/privacy-policy): what is collected (analytics
  only) and what is not.
- [Sitemap](${origin}/sitemap.xml): every static page plus every known
  character page.

## Current season

- Mythic+ season: ${currentSeasonName()}, ${dungeons.length} dungeons — ${dungeons.join(", ")}.
- Current raid tier: ${titleCase(DEFAULT_RAID)}.

Rankings, scores and progression on this site track the live game. Any numbers
quoted from a character page are a snapshot of when that page was fetched, not
a permanent fact about the character.

## Related

- [PugInspect addon on CurseForge](https://www.curseforge.com/wow/addons/puginspect):
  in-game addon that exports a raid roster for the roster check page.
- [Source code on GitHub](https://github.com/Christoffer-M/PugInspect).

## Attribution

PugInspect is an unofficial fan project. It is not affiliated with, endorsed by
or sponsored by Blizzard Entertainment, Raider.IO or Warcraft Logs. World of
Warcraft is a trademark of Blizzard Entertainment, Inc. Character data belongs
to those upstream services; PugInspect presents it.
`;
}

let cached: string | null = null;

/** The rendered /llms.txt. Its inputs are build-time constants, so the first
 * render is kept for the life of the process. */
export function renderLlmsTxt(): string {
  cached ??= buildLlmsTxt();
  return cached;
}
