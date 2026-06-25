import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getCharacterCardSnapshot, type CharacterCardSnapshot } from "../db/persistence.js";
import { normalizeName, normalizeRealm } from "../schema/utils/helpers.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "CharacterCard" });

const CARD_TTL_MS = 15 * 60_000; // 15 minutes, matching the RIO cache
const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-400-normal.woff";
const FALLBACK_COLOR = "#7a8290";
const DEFAULT_RAID = "tier-mn-1"; // keep in sync with frontend data/raidZones.ts

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

// Lazy font singleton — fetched once on first render, then reused.
let fontPromise: Promise<ArrayBuffer | null> | null = null;

async function getFont(): Promise<ArrayBuffer | null> {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Font fetch responded ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        logger.error("Font fetch failed", { error: String(err) });
        fontPromise = null; // allow retry on next request
        return null;
      });
  }
  return fontPromise;
}

const cache = new Map<string, { png: Buffer; expiresAt: number }>();

/** Satori takes a React-element-shaped object. This avoids a React dependency
 * and JSX config — we build the tree as plain objects. */
type Element = { type: string; props: Record<string, unknown> };
function h(
  type: string,
  props: Record<string, unknown>,
  ...children: unknown[]
): Element {
  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
}

/** "4/8 M · 8/8 H" style progression string for the current tier. */
function raidProgressSummary(snapshot: CharacterCardSnapshot): string {
  const current = snapshot.raidProgression?.[DEFAULT_RAID];
  if (!current) return "—";
  const { total_bosses: total, mythic_bosses_killed: m, heroic_bosses_killed: heroic } = current;
  if (m > 0) return `${m}/${total} M`;
  if (heroic === total) return `${heroic}/${total} H`;
  if (heroic > 0) return `${heroic}/${total} H`;
  const n = current.normal_bosses_killed;
  if (n > 0) return `${n}/${total} N`;
  return "N/A";
}

function statBlock(label: string, value: string, valueColor: string): Element {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "4px", width: "260px" } },
    h(
      "div",
      { style: { fontSize: "15px", color: "#7a8290", textTransform: "uppercase", letterSpacing: "1px" } },
      label
    ),
    h("div", { style: { fontSize: "30px", fontWeight: 400, color: valueColor } }, value)
  );
}

function buildCard(snapshot: CharacterCardSnapshot): Element {
  const color = classColor(snapshot.class);
  const realmLine = `(${snapshot.region.toUpperCase()}) ${snapshot.realm}`;
  const traits = [snapshot.race, snapshot.specialization, snapshot.class]
    .filter(Boolean)
    .join(" ");
  const ilvl = snapshot.itemLevel != null ? String(Math.round(snapshot.itemLevel)) : "—";
  const mScore =
    snapshot.mythicPlusScore != null ? String(Math.round(snapshot.mythicPlusScore)) : "—";
  const topKey = snapshot.topKeyLevel != null ? `+${snapshot.topKeyLevel}` : "—";

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "1200px",
        height: "630px",
        backgroundColor: "#16181d",
        fontFamily: "Inter",
      },
    },
    h("div", { style: { height: "8px", backgroundColor: color } }),
    h(
      "div",
      { style: { display: "flex", flex: "1", padding: "60px" } },
      // Left identity column
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            width: "360px",
            paddingRight: "40px",
          },
        },
        snapshot.thumbnailUrl
          ? h("img", {
              src: snapshot.thumbnailUrl,
              width: 96,
              height: 96,
              style: { borderRadius: "48px", border: `4px solid ${color}` },
            })
          : h("div", {
              style: {
                width: "96px",
                height: "96px",
                borderRadius: "48px",
                border: `4px solid ${color}`,
                backgroundColor: "#0f1116",
              },
            }),
        h(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "44px",
              fontWeight: 400,
              color,
              marginTop: "24px",
            },
          },
          snapshot.name
        ),
        h("div", { style: { display: "flex", fontSize: "22px", color: "#c7cdd9", marginTop: "8px" } }, realmLine),
        h("div", { style: { display: "flex", fontSize: "18px", color: "#7a8290", marginTop: "6px" } }, traits)
      ),
      // Right stats grid (2 columns x rows)
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            flex: "1",
            justifyContent: "center",
            gap: "44px",
          },
        },
        h(
          "div",
          { style: { display: "flex", gap: "40px" } },
          statBlock("Item Level", ilvl, "#ffffff"),
          statBlock("M+ Score", mScore, snapshot.mythicPlusColor ?? FALLBACK_COLOR)
        ),
        h(
          "div",
          { style: { display: "flex", gap: "40px" } },
          statBlock("Top Key", topKey, "#ffffff"),
          statBlock("Raid Prog", raidProgressSummary(snapshot), "#ffffff")
        )
      )
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          padding: "0 60px 32px",
          fontSize: "20px",
          color: "#5e6a82",
        },
      },
      "puginspect.com"
    )
  );
}

/**
 * Renders the per-character og:image card as a PNG. Returns null when no
 * cached character snapshot exists or the font is unavailable (caller 404s).
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

  const [snapshot, font] = await Promise.all([
    getCharacterCardSnapshot({ region: regionLc, realm: realmSlug, name: nameLc }),
    getFont(),
  ]);
  if (!snapshot || !font) return null;

  try {
    const svg = await satori(buildCard(snapshot) as never, {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
    cache.set(cacheKey, { png, expiresAt: Date.now() + CARD_TTL_MS });
    return png;
  } catch (err) {
    logger.error("Card render failed", { region, realm, name, error: String(err) });
    return null;
  }
}
