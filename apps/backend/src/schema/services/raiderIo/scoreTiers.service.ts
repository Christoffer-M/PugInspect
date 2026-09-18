import { config } from "../../../config/index.js";
import { MYTHIC_PLUS_SEASON_SLUGS, PREVIOUS_SEASON_SCORE_TIERS } from "../../../generated/seasonConfig.js";
import { fetcher } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";

/**
 * Raider.IO's Mythic+ rating colour scale. Ratings come from Blizzard, but
 * players read them in Raider.IO's colours. A colour is never stored with a
 * character — it's derived on read from the season's scale:
 * - an ended season's scale is final, so the previous season's ships in the
 *   generated season config (PREVIOUS_SEASON_SCORE_TIERS);
 * - the live season's keeps moving, so it's fetched here at boot and hourly,
 *   retried within minutes if Raider.IO is unreachable.
 * Request paths only read memory, so crawler traffic never triggers a fetch.
 */

export type ScoreTier = { score: number; color: string };

const logger = createLogger({ service: "ScoreTiers" });
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
/** After a failed refresh: 1, 2, then every 5 minutes until one succeeds. */
const RETRY_DELAYS_MS = [60_000, 120_000, 300_000];
const UPSTREAM_TIMEOUT_MS = 10_000;

/** The newest season the config knows, i.e. the live one. */
const LIVE_SEASON = Object.entries(MYTHIC_PLUS_SEASON_SLUGS).sort(([a], [b]) => Number(b) - Number(a))[0]?.[1];

const frozen = new Map<string, ScoreTier[]>(
  PREVIOUS_SEASON_SCORE_TIERS.season
    ? [[PREVIOUS_SEASON_SCORE_TIERS.season, PREVIOUS_SEASON_SCORE_TIERS.tiers.map(([score, color]) => ({ score, color }))]]
    : []
);
let live: ScoreTier[] | undefined;

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

/** Null when the season's scale isn't available (an unknown season, or the
 *  live one before its first successful fetch) — clients fall back to their own. */
export function ratingColor(season: string | null | undefined, rating: number): string | null {
  if (!season) return null;
  const tiers = season === LIVE_SEASON ? live : frozen.get(season);
  return tiers ? colorForRating(tiers, rating) : null;
}

/** Delay before the next refresh: hourly after a success, backing off
 *  1 → 2 → 5 minutes after consecutive failures. */
export function nextRefreshDelay(consecutiveFailures: number): number {
  if (consecutiveFailures === 0) return REFRESH_INTERVAL_MS;
  return RETRY_DELAYS_MS[Math.min(consecutiveFailures, RETRY_DELAYS_MS.length) - 1]!;
}

async function refresh(): Promise<boolean> {
  if (!LIVE_SEASON) return true;
  try {
    const url = new URL("https://raider.io/api/v1/mythic-plus/score-tiers");
    url.searchParams.set("season", LIVE_SEASON);
    url.searchParams.set("access_key", config.raiderIoApiKey);
    live = parseScoreTiers(await fetcher<unknown>(url.toString(), { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }));
    logger.debug("Score tiers refreshed", { season: LIVE_SEASON, tiers: live.length, top: live[0]!.score });
    return true;
  } catch (err) {
    // Keep whatever was loaded before: an hour-old scale beats none.
    logger.warn("Score tier refresh failed", { season: LIVE_SEASON, stale: live !== undefined, error: String(err) });
    return false;
  }
}

/** Loads the live season's tiers now, then keeps them fresh. Called once at boot. */
export function startScoreTierRefresh(): void {
  let failures = 0;
  const run = async () => {
    failures = (await refresh()) ? 0 : failures + 1;
    setTimeout(() => void run(), nextRefreshDelay(failures)).unref();
  };
  void run();
}
