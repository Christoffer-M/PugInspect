import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getCharacterCardSnapshot, type CharacterCardSnapshot } from "../db/persistence.js";
import { normalizeName, normalizeRealm } from "../schema/utils/helpers.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "CharacterCard" });

const CARD_TTL_MS = 15 * 60_000; // 15 minutes, matching the RIO cache
const FALLBACK_COLOR = "#7a8290";
const DEFAULT_RAID = "tier-mn-1"; // SEASON-CONFIG: keep in sync with frontend data/raidZones.ts

const FONT_BARLOW_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/barlow@5.1.1/files/barlow-latin-600-normal.woff";
const FONT_BARLOW_CONDENSED_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/barlow-condensed@5.1.1/files/barlow-condensed-latin-800-normal.woff";

// Class colors mirror CLASS_COLORS in frontend/src/util/util.ts.
// ponytail: duplicated rather than sharing a package — it's 12 lines that
// change once a decade. Promote to @repo/* if a third consumer appears.
const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

function classColor(className: string | null): string {
  if (!className) return FALLBACK_COLOR;
  return CLASS_COLORS[className.toLowerCase()] ?? FALLBACK_COLOR;
}

// Lazy font singletons — fetched once on first render, then reused.
let barlowPromise: Promise<ArrayBuffer | null> | null = null;
let barlowCondensedPromise: Promise<ArrayBuffer | null> | null = null;

async function fetchFont(url: string, label: string): Promise<ArrayBuffer | null> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Font fetch responded ${res.status}`);
      return res.arrayBuffer();
    })
    .catch((err) => {
      logger.error(`Font fetch failed: ${label}`, { error: String(err) });
      return null;
    });
}

async function getFonts(): Promise<{ barlow: ArrayBuffer | null; barlowCondensed: ArrayBuffer | null }> {
  if (!barlowPromise) barlowPromise = fetchFont(FONT_BARLOW_URL, "Barlow-600");
  if (!barlowCondensedPromise) barlowCondensedPromise = fetchFont(FONT_BARLOW_CONDENSED_URL, "BarlowCondensed-800");
  const [barlow, barlowCondensed] = await Promise.all([barlowPromise, barlowCondensedPromise]);
  // Reset on failure so the next request retries.
  if (!barlow) barlowPromise = null;
  if (!barlowCondensed) barlowCondensedPromise = null;
  return { barlow, barlowCondensed };
}

const cache = new Map<string, { png: Buffer; expiresAt: number }>();

// Sweep expired PNGs periodically so distinct-character crawls don't grow the
// cache unbounded (mirrors the rate limiter sweep in index.ts).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, CARD_TTL_MS).unref();

/** Satori takes a React-element-shaped object. This avoids a React dependency
 * and JSX config — we build the tree as plain objects. */
type Element = { type: string; props: Record<string, unknown> };
function h(
  type: string,
  props: Record<string, unknown>,
  ...children: unknown[]
): Element {
  // satori treats an empty `children` array as ambiguous and throws the
  // "more than one child" error, so emit undefined when there are no children.
  const child = children.length === 0 ? undefined : children.length === 1 ? children[0] : children;
  return { type, props: { ...props, children: child } };
}

/** Current-tier raid progression summary, e.g. "4/8 M".
 * Kept in sync with getRaidProgressSummary in frontend CharacterHeader.tsx. */
function raidProgressSummary(snapshot: CharacterCardSnapshot): string {
  const current = snapshot.raidProgression?.[DEFAULT_RAID];
  if (!current) return "—";
  const { total_bosses: total, mythic_bosses_killed: m, heroic_bosses_killed: heroic, normal_bosses_killed: n } = current;
  if (m > 0) return `${m}/${total} M`;
  if (heroic > 0) return `${heroic}/${total} H`;
  if (n > 0) return `${n}/${total} N`;
  return "—";
}

function statCard(label: string, value: string, valueColor: string, accent = false): Element {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        flex: "1",
        background: accent ? "rgba(255,70,70,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(255,90,90,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "14px",
        padding: "26px 30px",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "Barlow",
          letterSpacing: "2px",
          color: "#7A90A8",
          textTransform: "uppercase",
          marginBottom: "12px",
        },
      },
      label
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          fontFamily: "BarlowCondensed",
          fontSize: "90px",
          fontWeight: 800,
          color: valueColor,
          lineHeight: "1",
        },
      },
      value
    )
  );
}

function buildCard(snapshot: CharacterCardSnapshot): Element {
  const color = classColor(snapshot.class);
  const realmLine = `(${snapshot.region.toUpperCase()}) ${snapshot.realm}`;
  const traits = [snapshot.race, snapshot.specialization, snapshot.class].filter(Boolean).join(" ");
  const ilvl = snapshot.itemLevel != null ? String(Math.round(snapshot.itemLevel)) : "—";
  const mScore = snapshot.mythicPlusScore != null ? String(Math.round(snapshot.mythicPlusScore)) : "—";
  const topKey = snapshot.topKeyLevel != null ? `+${snapshot.topKeyLevel}` : "—";
  const mColor = snapshot.mythicPlusColor ?? "#FF5252";

  const avatar = snapshot.thumbnailUrl
    ? h(
        "div",
        { style: { display: "flex", width: "152px", height: "152px", borderRadius: "76px", padding: "3px", backgroundColor: color } },
        h(
          "div",
          { style: { display: "flex", flex: 1, borderRadius: "72px", overflow: "hidden" } },
          h("img", { src: snapshot.thumbnailUrl, width: 146, height: 146, style: { objectFit: "cover" } })
        )
      )
    : h("div", { style: { display: "flex", width: "152px", height: "152px", borderRadius: "76px", backgroundColor: "#1a2030" } });

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", width: "1200px", height: "630px", backgroundColor: "#0C1018", fontFamily: "Barlow" } },
    // Accent bar (no children — no display:flex needed)
    h("div", { style: { width: "780px", height: "4px", background: `linear-gradient(90deg, ${color} 0%, ${color}66 65%, transparent 100%)` } }),
    // Main content row
    h(
      "div",
      { style: { display: "flex", flex: 1 } },
      // Left column
      h(
        "div",
        // width: 64px page padding + 348px content column
        { style: { display: "flex", flexDirection: "column", width: "412px", paddingLeft: "64px", paddingTop: "60px" } },
        avatar,
        h("div", { style: { display: "flex", marginTop: "30px", fontFamily: "BarlowCondensed", fontSize: "86px", fontWeight: 800, color, lineHeight: "1", letterSpacing: "-1.5px" } }, snapshot.name),
        h("div", { style: { display: "flex", marginTop: "14px", fontSize: "24px", fontWeight: 600, color: "#8A9BB0" } }, realmLine),
        h("div", { style: { display: "flex", marginTop: "6px", fontSize: "20px", color: "#55677A" } }, traits)
      ),
      // Divider (no children — no display:flex needed)
      h("div", { style: { width: "1px", marginTop: "68px", marginBottom: "68px", background: `linear-gradient(180deg, transparent 0%, ${color}38 20%, ${color}38 80%, transparent 100%)` } }),
      // Right column
      h(
        "div",
        { style: { display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", paddingLeft: "34px", paddingRight: "60px", gap: "18px" } },
        h("div", { style: { display: "flex", gap: "18px" } },
          statCard("Item Level", ilvl, "#E8EDF2"),
          statCard("M+ Score", mScore, mColor, true)
        ),
        h("div", { style: { display: "flex", gap: "18px" } },
          statCard("Top Key", topKey, "#E8EDF2"),
          statCard("Raid Prog", raidProgressSummary(snapshot), "#E8EDF2")
        )
      )
    ),
    // Brand
    h("div", { style: { display: "flex", justifyContent: "flex-end", paddingRight: "64px", paddingBottom: "26px", fontSize: "14px", fontWeight: 600, letterSpacing: "2px", color: "#2A3548" } }, "puginspect.com")
  );
}

/**
 * Renders the per-character og:image card as a PNG. Returns null when no
 * cached character snapshot exists or the fonts are unavailable (caller 404s).
 */
export async function renderCharacterCard(
  region: string,
  realm: string,
  name: string
): Promise<Buffer | null> {
  const regionLc = region.trim().toLowerCase();
  const realmSlug = normalizeRealm(realm);
  const nameLc = normalizeName(name);
  if (!VALID_REGIONS.has(regionLc) || !realmSlug || !nameLc) return null;

  const cacheKey = `${regionLc}:${realmSlug}:${nameLc}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.png;

  const [snapshot, fonts] = await Promise.all([
    getCharacterCardSnapshot({ region: regionLc, realm: realmSlug, name: nameLc }),
    getFonts(),
  ]);
  if (!snapshot || !fonts.barlow || !fonts.barlowCondensed) {
    logger.warn("Card render skipped", { region, realm, name, hasSnapshot: !!snapshot, hasBarlow: !!fonts.barlow, hasBarlowCondensed: !!fonts.barlowCondensed });
    return null;
  }

  try {
    const svg = await satori(buildCard(snapshot) as never, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Barlow", data: fonts.barlow, weight: 600, style: "normal" },
        { name: "BarlowCondensed", data: fonts.barlowCondensed, weight: 800, style: "normal" },
      ],
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
    cache.set(cacheKey, { png, expiresAt: Date.now() + CARD_TTL_MS });
    return png;
  } catch (err) {
    logger.error("Card render failed", { region, realm, name, error: String(err) });
    return null;
  }
}
