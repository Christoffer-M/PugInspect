import { config } from "../config/index.js";
import { getSitemapCharacters } from "../db/persistence.js";
import { getMplusStatsMeta } from "../db/mplusStats.js";
import { defaultZoneId } from "../schema/services/mythicPlusStats/mythicPlusStats.services.js";

const CACHE_TTL_MS = 60 * 60_000;
// The sitemap protocol caps a single file at 50,000 URLs; leave headroom for
// the static entries. If the characters table ever exceeds this, switch to a
// sitemap index with paginated child sitemaps.
const MAX_CHARACTER_URLS = 49_000;

// Static SPA pages. lastmod reflects the last content change to the page —
// bump when the corresponding route component meaningfully changes.
const STATIC_PAGES = [
  { path: "/", lastmod: "2026-07-10", changefreq: "weekly", priority: "1.0" },
  // Rankings page: a live dataset, not editorial copy — its lastmod comes from
  // the last successful crawl (see mythicPlusLastmod), so this date is only the
  // fallback for when the crawl has never run.
  { path: "/mythic-plus", lastmod: "2026-08-27", changefreq: "hourly", priority: "0.9" },
  { path: "/privacy-policy", lastmod: "2026-06-11", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  const fields = [
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
  ].filter(Boolean);
  return `  <url>\n${fields.join("\n")}\n  </url>`;
}

/** Date of the last Mythic+ spec meta crawl, or `fallback` if none is stored. */
async function mythicPlusLastmod(fallback: string): Promise<string> {
  const zoneId = defaultZoneId();
  if (zoneId == null) return fallback;
  const meta = await getMplusStatsMeta(zoneId);
  return meta ? meta.refreshedAt.toISOString().slice(0, 10) : fallback;
}

let cache: { xml: string; expiresAt: number } | null = null;

/**
 * Builds the full sitemap: static pages plus every known character page,
 * cached in-memory. DB failure degrades to a statics-only sitemap rather
 * than an error response.
 */
export async function renderSitemapXml(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt) return cache.xml;

  const rows = await getSitemapCharacters(MAX_CHARACTER_URLS);

  const entries = [
    ...(await Promise.all(
      STATIC_PAGES.map(async (p) =>
        urlEntry(
          `${config.publicOrigin}${p.path}`,
          p.path === "/mythic-plus" ? await mythicPlusLastmod(p.lastmod) : p.lastmod,
          p.changefreq,
          p.priority
        )
      )
    )),
    ...rows.map((c) =>
      urlEntry(
        `${config.publicOrigin}/${c.region}/${encodeURIComponent(c.realm)}/${encodeURIComponent(c.name)}`,
        c.updatedAt.toISOString().slice(0, 10)
      )
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  cache = { xml, expiresAt: Date.now() + CACHE_TTL_MS };
  return xml;
}
