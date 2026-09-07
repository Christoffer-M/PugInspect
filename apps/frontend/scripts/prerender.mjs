// Vite emits a single index.html for every route, so each static page ships
// the same empty <div id="app">: identical <title>, no <h1>, no links. A
// crawler that doesn't run JavaScript — Semrush, and every answer engine —
// sees nothing else, which is what the September 2026 audit was measuring.
//
// This writes a real head and a text summary into a sibling .html per static
// route at build time; nginx serves them with `try_files $uri $uri.html`.
//
// ponytail: deliberately not the backend's job. These pages have no per-URL
// data, so there is nothing to look up and no reason to gate on a bot
// user-agent — everyone gets the same file, and there is no allowlist to keep
// up to date. Character pages stay dynamic (see backend/src/seo/characterMeta).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://puginspect.com";
const OG_IMAGE = `${ORIGIN}/og-image.png`;

// Replaced in place, markers included: the backend fetches the built
// index.html as its character-page template and rewrites the same two blocks.
// Dropping the markers here would silently kill character-page meta injection.
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
const BODY_BLOCK = /<!--body:start-->[\s\S]*?<!--body:end-->/;

/**
 * `title` and `description` are duplicated in each route's head() so that
 * client-side navigation updates the tab title too — change one, change both.
 * `body` is a strict subset of what the rendered page shows: React wipes
 * #app on mount, so this is a plain-text stand-in, never crawler-only content.
 * All copy is authored here rather than user input, so nothing needs escaping.
 */
export const PAGES = [
  {
    file: "index.html",
    path: "/",
    nav: "Character inspector",
    title: "PugInspect - WoW Character Inspector",
    description:
      "Inspect any World of Warcraft character in seconds - gear and item level, Raider.IO Mythic+ score, raid progression and Warcraft Logs parse percentiles.",
    h1: "Welcome to PugInspect",
    body: [
      "<p>Quickly view WoW character stats, RIO scores, and raid logs. Start by typing a character name, or paste a Raider.IO or PugInspect link.</p>",
      "<p>Each character page combines gear and item level from the Blizzard profile API, Mythic+ score and dungeon runs from Raider.IO, and raid parse percentiles from Warcraft Logs.</p>",
    ],
  },
  {
    file: "mythic-plus.html",
    path: "/mythic-plus",
    nav: "Mythic+ spec meta",
    title: "Mythic+ Spec Meta | PugInspect",
    description:
      "Which Mythic+ specs are actually performing. Median, top 5% and best-parse DPS and HPS for all 40 specs, from Warcraft Logs, refreshed hourly.",
    h1: "Mythic+ Spec Meta",
    body: [
      "<p>Every spec's fastest Mythic+ runs, ranked by raw throughput at the keys and dungeons they were actually logged in.</p>",
      "<p>Median, top 5% and best-parse DPS and HPS for all 40 specs, sampled from Warcraft Logs at equal depth per spec and refreshed hourly.</p>",
    ],
  },
  {
    file: "roster.html",
    path: "/roster",
    nav: "Roster check",
    title: "Roster Check - Inspect a Full Raid Roster | PugInspect",
    description:
      "Paste a raid roster export and inspect the whole team at once - item level, RIO score, raid progress and log percentiles for every character on one screen.",
    h1: "Roster Check",
    body: [
      "<p>Is this pug going to clear it, or waste your evening?</p>",
      "<p>Paste a roster export from the PugInspect addon and inspect the whole team at once - item level, Raider.IO score, raid progress and log percentiles for every character on one screen.</p>",
    ],
  },
  {
    file: "privacy-policy.html",
    path: "/privacy-policy",
    nav: "Privacy policy",
    title: "Privacy Policy - Analytics and Data | PugInspect",
    description:
      "How PugInspect handles analytics and Companion app data: anonymous usage statistics, no cookies, no accounts and no personal information collected.",
    h1: "Privacy Policy",
    body: [
      "<p>This website is a non-commercial fan project.</p>",
      "<p>We use Umami Cloud Analytics to collect anonymous usage statistics in order to improve the website. No cookies are used for analytics purposes.</p>",
      "<p>The PugInspect Companion desktop application reports separately, to our own servers rather than to Umami, roughly every half hour while it is running.</p>",
    ],
  },
];

export function renderPage(template, page) {
  if (!SEO_BLOCK.test(template) || !BODY_BLOCK.test(template)) {
    throw new Error("index.html is missing its seo: or body: markers");
  }

  const canonical = `${ORIGIN}${page.path}`;
  const head = [
    `<title>${page.title}</title>`,
    `<meta name="description" content="${page.description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${page.title}" />`,
    `<meta property="og:description" content="${page.description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${page.title}" />`,
    `<meta name="twitter:description" content="${page.description}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<link rel="canonical" href="${canonical}" />`,
  ].join("\n  ");

  // Without these the shell has no <a href> at all and a crawler reaches
  // exactly one page — the audit crawled two URLs against a 14,600-URL sitemap.
  const nav = PAGES.filter((p) => p.path !== page.path)
    .map((p) => `<a href="${ORIGIN}${p.path}">${p.nav}</a>`)
    .join(" · ");

  const body = `<div id="app">
  <main>
    <h1>${page.h1}</h1>
${page.body.map((p) => `    ${p}`).join("\n")}
    <p>${nav}</p>
  </main>
</div>`;

  return template
    .replace(SEO_BLOCK, `<!--seo:start-->\n  ${head}\n  <!--seo:end-->`)
    .replace(BODY_BLOCK, `<!--body:start-->${body}<!--body:end-->`);
}

async function main() {
  const dist = path.resolve(import.meta.dirname, "../dist");
  const template = await readFile(path.join(dist, "index.html"), "utf8");
  for (const page of PAGES) {
    await writeFile(path.join(dist, page.file), renderPage(template, page));
  }
  console.log(`prerendered ${PAGES.length} static pages`);
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) await main();
