import { config } from "../../../config/index.js";
import { MYTHIC_PLUS_SEASON_SLUGS } from "../../../generated/seasonConfig.js";
import { fetcher } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";

/**
 * Raider.IO's Mythic+ rating colour scale. Ratings come from Blizzard, but
 * players read them in Raider.IO's colours, and that scale is recomputed
 * during a season — so a colour is never stored, only derived at read time
 * from these in-memory tables. Two small requests an hour (current and
 * previous season); request paths only ever read the cache, so crawler
 * traffic can't trigger an upstream call.
 */

export type ScoreTier = { score: number; color: string };

const logger = createLogger({ service: "ScoreTiers" });
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 10_000;

/** The seasons a character page shows: the two newest the config knows. */
const SEASONS = Object.entries(MYTHIC_PLUS_SEASON_SLUGS)
  .sort(([a], [b]) => Number(b) - Number(a))
  .slice(0, 2)
  .map(([, slug]) => slug);

const tiersBySeason = new Map<string, ScoreTier[]>();

/** Validates and orders a score-tiers response (highest threshold first).
 *  Throws on anything unexpected, so a bad payload never replaces good tiers. */
export function parseScoreTiers(payload: unknown): ScoreTier[] {
  if (!Array.isArray(payload) || payload.length === 0) throw new Error("Expected a non-empty tier list");
  return payload
    .map((t: { score?: unknown; rgbHex?: unknown }) => {
      if (typeof t?.score !== "number" || typeof t.rgbHex !== "string" || !/^#[0-9a-f]{6}$/i.test(t.rgbHex)) {
        throw new Error(`Malformed tier: ${JSON.stringify(t)}`);
      }
      return { score: t.score, color: t.rgbHex.toLowerCase() };
    })
    .sort((a, b) => b.score - a.score);
}

/** The colour of the highest tier the rating reaches; below the lowest tier,
 *  the lowest tier's colour (Raider.IO's scale bottoms out at white). */
export function colorForRating(tiers: ScoreTier[], rating: number): string | null {
  return (tiers.find((t) => rating >= t.score) ?? tiers[tiers.length - 1])?.color ?? null;
}

/** Null when the season's tiers aren't loaded (unknown season, or Raider.IO
 *  unreachable since boot) — clients fall back to their own scale. */
export function ratingColor(season: string | null | undefined, rating: number): string | null {
  const tiers = season ? tiersBySeason.get(season) : undefined;
  return tiers ? colorForRating(tiers, rating) : null;
}

async function refresh(): Promise<void> {
  await Promise.all(
    SEASONS.map(async (season) => {
      try {
        const url = new URL("https://raider.io/api/v1/mythic-plus/score-tiers");
        url.searchParams.set("season", season);
        url.searchParams.set("access_key", config.raiderIoApiKey);
        const payload = await fetcher<unknown>(url.toString(), { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
        const tiers = parseScoreTiers(payload);
        tiersBySeason.set(season, tiers);
        logger.debug("Score tiers refreshed", { season, tiers: tiers.length, top: tiers[0]!.score });
      } catch (err) {
        // Keep whatever was loaded before: an hour-old scale beats none.
        logger.warn("Score tier refresh failed", {
          season,
          stale: tiersBySeason.has(season),
          error: String(err),
        });
      }
    })
  );
}

/** Loads the tiers now and then hourly. Called once at boot. */
export function startScoreTierRefresh(): void {
  void refresh();
  setInterval(() => void refresh(), REFRESH_INTERVAL_MS).unref();
}
