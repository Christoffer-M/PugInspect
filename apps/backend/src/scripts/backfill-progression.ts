/**
 * One-off: fill character_progression_snapshots (Blizzard M+ rating, best runs,
 * raid progression) for every character that doesn't have one yet — which,
 * right after that table was introduced, is all of them. Until then crawler
 * pages and alt cards show no M+ data, since crawler traffic never fetches.
 *
 * Most recently updated characters first, so the pages people view and crawlers
 * index are fixed first. Resumable: a character with a snapshot is skipped, so
 * a crash or a deploy mid-run costs nothing but the restart. Paced to a request
 * budget (default 10k/hour, well under Blizzard's 36k/hour, shared with live
 * traffic); ~18.6k characters take about 5.5 hours at the default.
 *
 *   pnpm backfill:progression [--requests-per-hour=10000] [--limit=N]
 *
 * In production, detached so it survives the SSH session:
 *   docker compose exec -d backend sh -c 'node dist/scripts/backfill-progression.js > /tmp/backfill-progression.log 2>&1'
 *   docker compose exec backend tail -n 5 /tmp/backfill-progression.log
 * Progress also reaches Honeycomb as logs (service=BackfillProgression).
 */

// First, so the log exporter is registered before anything logs.
import { shutdownTelemetry } from "../telemetry.js";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { config } from "../config/index.js";
import { initDb, getDb, closeDb } from "../db/index.js";
import { characters, characterProgressionSnapshots } from "../db/schema.js";
import { ProgressionService } from "../schema/services/blizzard/progression.service.js";
import { VALID_REGIONS } from "../schema/utils/regions.js";
import { createLogger } from "../schema/utils/logger.js";
import { Pacer } from "./pace.js";

const logger = createLogger({ service: "BackfillProgression" });

/** Per character: current season, previous season, raid encounters. The
 *  season index and OAuth token are cached for the run and don't count. */
const REQUESTS_PER_CHARACTER = 3;
const PROGRESS_EVERY = 500;
/** Blizzard or the database is down, not a bad character: stop instead of
 *  logging a failure per character for the rest of the backlog. */
const MAX_CONSECUTIVE_FAILURES = 50;

function numberArg(name: string, fallback: number | undefined): number | undefined {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be a positive number`);
  return value;
}

const regions = [...VALID_REGIONS];
const withoutSnapshot = and(inArray(characters.region, regions), isNull(characterProgressionSnapshots.id));

async function pendingCharacters(limit: number | undefined) {
  const query = getDb()
    .select({ name: characters.name, realm: characters.realm, region: characters.region })
    .from(characters)
    .leftJoin(characterProgressionSnapshots, eq(characterProgressionSnapshots.characterId, characters.id))
    .where(withoutSnapshot)
    .orderBy(desc(characters.updatedAt));
  return limit ? query.limit(limit) : query;
}

async function countAlreadyDone(): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(characters)
    .innerJoin(characterProgressionSnapshots, eq(characterProgressionSnapshots.characterId, characters.id))
    .where(inArray(characters.region, regions));
  return row?.n ?? 0;
}

async function main() {
  const requestsPerHour = numberArg("requests-per-hour", 10_000)!;
  const limit = numberArg("limit", undefined);
  initDb(config.databaseUrl);

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      stopping = true;
      logger.warn("Backfill stopping after the current character", { signal });
    });
  }

  const [pending, alreadyDone] = await Promise.all([pendingCharacters(limit), countAlreadyDone()]);
  const pacer = new Pacer(Pacer.intervalFor(requestsPerHour, REQUESTS_PER_CHARACTER));
  logger.info("Backfill started", {
    pending: pending.length,
    alreadyDone,
    requestsPerHourCap: requestsPerHour,
    etaMinutes: Math.round(pacer.etaMs(pending.length) / 60_000),
  });

  const tally = { succeeded: 0, notFound: 0, failed: 0 };
  const startedAt = Date.now();
  const progress = (processed: number) => {
    const hours = (Date.now() - startedAt) / 3_600_000;
    return {
      processed,
      pending: pending.length,
      ...tally,
      // Estimated from the per-character cost; cache hits (a character viewed
      // since the run started) make the real figure lower.
      estRequestsPerHour: hours > 0 ? Math.round((processed * REQUESTS_PER_CHARACTER) / hours) : 0,
      etaMinutes: Math.round(pacer.etaMs(pending.length - processed) / 60_000),
    };
  };

  let processed = 0;
  let consecutiveFailures = 0;
  try {
    for (const character of pending) {
      if (stopping) break;
      await new Promise((resolve) => setTimeout(resolve, pacer.delayBefore(processed)));
      try {
        await ProgressionService.getProgression(character);
        tally.succeeded++;
        consecutiveFailures = 0;
      } catch (err) {
        if (err instanceof GraphQLError && err.extensions.code === "NOT_FOUND") {
          // Deleted, renamed or transferred: nothing to fill, and not an error.
          tally.notFound++;
          consecutiveFailures = 0;
        } else {
          tally.failed++;
          consecutiveFailures++;
          logger.warn("Backfill failed for character", {
            region: character.region,
            realm: character.realm,
            name: character.name,
            error: String(err),
          });
        }
      }
      processed++;
      if (processed % PROGRESS_EVERY === 0) logger.info("Backfill progress", progress(processed));
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        logger.error("Backfill aborted — upstream looks down; re-run to resume", progress(processed));
        process.exitCode = 1;
        return;
      }
    }
    logger.info(stopping ? "Backfill interrupted — re-run to resume" : "Backfill complete", progress(processed));
  } finally {
    await closeDb();
    await shutdownTelemetry();
  }
}

main().catch(async (err) => {
  logger.error("Backfill script failed", { error: String(err) });
  await shutdownTelemetry();
  process.exit(1);
});
