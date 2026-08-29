import { config } from "../config/index.js";
import {
  getCharacterMetaSnapshot,
  getRosterBySlug,
  type CharacterMetaSnapshot,
} from "../db/persistence.js";
import { normalizeName, normalizeRealm } from "../schema/utils/helpers.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "CharacterMeta" });

const MAX_NAME_LENGTH = 50;
const MAX_REALM_LENGTH = 100;
const TEMPLATE_TTL_MS = 5 * 60_000;
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;

const GENERIC_DESCRIPTION =
  "View gear, Raider.IO score, raid progression and Mythic+ runs.";

/** Escapes all HTML-significant characters. Route params arrive percent-decoded
 * from Express, so every user-supplied or DB-sourced value must pass through
 * this before entering attribute or text contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "tarren-mill" → "Tarren Mill", "zugzug" → "Zugzug" */
function titleCase(slug: string): string {
  return slug
    .split(/[-\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// index.html is built into the frontend image (content-hashed bundle paths),
// so it is fetched at runtime and cached rather than baked into this image.
// The frontend container may start after the backend — fetch lazily, and keep
// serving the last good copy if a refresh fails.
let template: { html: string; expiresAt: number } | null = null;

async function getIndexHtml(): Promise<string | null> {
  if (template && Date.now() < template.expiresAt) return template.html;
  try {
    const res = await fetch(`${config.frontendOrigin}/index.html`);
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    template = { html: await res.text(), expiresAt: Date.now() + TEMPLATE_TTL_MS };
    return template.html;
  } catch (err) {
    logger.error("Failed to fetch index.html template", { error: String(err) });
    return template?.html ?? null;
  }
}

function buildDescription(
  snapshot: CharacterMetaSnapshot | null,
  displayName: string,
  displayRealm: string,
  region: string
): string {
  const identity = `${displayName} on ${displayRealm} (${region.toUpperCase()})`;

  const traits = [snapshot?.race, snapshot?.specialization, snapshot?.class]
    .filter(Boolean)
    .join(" ");
  const stats = [
    snapshot?.itemLevel != null ? `ilvl ${Math.round(snapshot.itemLevel)}` : null,
    snapshot?.mythicPlusScore != null ? `M+ score ${Math.round(snapshot.mythicPlusScore)}` : null,
  ].filter(Boolean);

  const details = [traits, ...stats].filter(Boolean).join(", ");
  return details
    ? `${identity} — ${details}. ${GENERIC_DESCRIPTION}`
    : `${identity}. ${GENERIC_DESCRIPTION}`;
}

function buildMetaBlock(
  title: string,
  description: string,
  canonical: string,
  ogImage: string
): string {
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ].join("\n  ");
}

/** Last-resort response when index.html has never been fetched successfully.
 * Bots only read the head, so a minimal shell is still a useful answer. */
function fallbackShell(metaBlock: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${metaBlock}
</head>
<body></body>
</html>`;
}

/**
 * Renders index.html with per-character SEO meta tags injected, replacing the
 * static defaults between the seo:start/seo:end markers.
 * Returns null for invalid input (caller should 404).
 */
export async function renderCharacterPageHtml(
  region: string,
  realm: string,
  name: string
): Promise<string | null> {
  const regionLc = region.trim().toLowerCase();
  const realmSlug = normalizeRealm(realm);
  const nameLc = normalizeName(name);

  if (!VALID_REGIONS.has(regionLc)) return null;
  if (!nameLc || nameLc.length > MAX_NAME_LENGTH) return null;
  if (!realmSlug || realmSlug.length > MAX_REALM_LENGTH) return null;

  const snapshot = await getCharacterMetaSnapshot({
    region: regionLc,
    realm: realmSlug,
    name: nameLc,
  });

  const displayName = snapshot?.name ? titleCase(snapshot.name) : titleCase(nameLc);
  const displayRealm = snapshot?.realm ? titleCase(snapshot.realm) : titleCase(realmSlug);

  const title = `${displayName}-${displayRealm} | PugInspect`;
  const description = buildDescription(snapshot, displayName, displayRealm, regionLc);
  const canonical = `${config.publicOrigin}/${regionLc}/${encodeURIComponent(realmSlug)}/${encodeURIComponent(nameLc)}`;
  const ogImage = `${config.publicOrigin}/card/${regionLc}/${encodeURIComponent(realmSlug)}/${encodeURIComponent(nameLc)}`;

  const metaBlock = buildMetaBlock(title, description, canonical, ogImage);
  const html = await getIndexHtml();
  if (!html) return fallbackShell(metaBlock);

  return html.replace(SEO_BLOCK, metaBlock);
}

/**
 * Meta for a shared Roster Check link (/roster/{region}/{slug}) — the core
 * loop is pasting these into Discord, so unfurlers need real tags, not the
 * homepage defaults. Returns null for an invalid region or unknown slug.
 */
export async function renderRosterPageHtml(region: string, slug: string): Promise<string | null> {
  const regionLc = region.trim().toLowerCase();
  if (!VALID_REGIONS.has(regionLc)) return null;
  if (!/^[a-z0-9]{1,16}$/.test(slug)) return null;

  let roster;
  try {
    roster = await getRosterBySlug(regionLc, slug);
  } catch (err) {
    logger.error("Roster meta lookup failed", { region: regionLc, slug, error: String(err) });
    return null;
  }
  if (!roster) return null;

  const count = roster.characters.length;
  const title = `Roster Check (${count} character${count === 1 ? "" : "s"}) | PugInspect`;
  const description = `A shared ${regionLc.toUpperCase()} raid roster — item level, Raider.IO score, raid progress and log percentiles for all ${count} characters at a glance.`;
  const canonical = `${config.publicOrigin}/roster/${regionLc}/${slug}`;

  const metaBlock = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ].join("\n  ");

  const html = await getIndexHtml();
  if (!html) return fallbackShell(metaBlock);
  return html.replace(SEO_BLOCK, metaBlock);
}
