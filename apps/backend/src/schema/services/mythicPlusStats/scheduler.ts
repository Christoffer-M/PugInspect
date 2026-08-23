import { createLogger } from "../../utils/logger.js";
import { getMplusStatsMeta } from "../../../db/mplusStats.js";
import { defaultZoneId, refreshMythicPlusStats } from "./mythicPlusStats.services.js";

const logger = createLogger({ service: "MythicPlusStats" });

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
/** On boot, only crawl straight away if what's stored is older than this. */
const STALE_AFTER_MS = 90 * 60 * 1000;

let refreshInFlight = false;

async function runOnce(zoneId: number) {
  // A crawl slowed past the interval (WCL slowness, compounding circuit-breaker
  // backoffs) must not spawn a second concurrent crawl — both would burn the
  // shared rate-limit budget and race their wholesale replaces.
  if (refreshInFlight) {
    logger.warn("Mythic+ stats refresh still running, skipping this tick", { zoneId });
    return;
  }
  refreshInFlight = true;
  try {
    await refreshMythicPlusStats(zoneId);
  } catch (error) {
    // A failed crawl leaves the previous refresh in place, so log and wait for
    // the next tick rather than taking the process down.
    logger.error("Mythic+ stats refresh failed", { zoneId, error: String(error) });
  } finally {
    refreshInFlight = false;
  }
}

/**
 * Hourly rebuild of the Mythic+ spec meta. Measured at ~410 rate-limit points
 * per pass against a 3,600/hour budget; the service also checks the remaining
 * budget before starting so live character lookups always take priority.
 */
export function startMythicPlusStatsRefresh(): void {
  const zoneId = defaultZoneId();
  if (zoneId == null) {
    logger.warn("No Mythic+ zone in season config, spec meta refresh disabled");
    return;
  }

  void (async () => {
    const meta = await getMplusStatsMeta(zoneId);
    const age = meta ? Date.now() - meta.refreshedAt.getTime() : Infinity;
    if (age > STALE_AFTER_MS) await runOnce(zoneId);
    else logger.info("Mythic+ spec stats still fresh, skipping boot refresh", { zoneId, age });
  })();

  setInterval(() => void runOnce(zoneId), REFRESH_INTERVAL_MS).unref();
}
