/**
 * Backfill alt detection for characters that existed before enrichAndLinkAlts was introduced.
 *
 * Queries all characters with no rows in characterAchievements (i.e. never enriched),
 * then runs AchievementsService.enrichAndLinkAlts() for each one.
 *
 * Run after building:
 *   pnpm build && node dist/scripts/backfill-alt-links.js
 */

import { config } from "../config/index.js";
import { initDb, getDb, closeDb } from "../db/index.js";
import { characters, characterAchievements } from "../db/schema.js";
import { AchievementsService } from "../schema/services/blizzard/achievements.service.js";
import { createLogger } from "../schema/utils/logger.js";
import { eq, isNull } from "drizzle-orm";

const logger = createLogger({ service: "BackfillAltLinks" });

// Process this many characters concurrently. Blizzard allows ~100 req/s,
// but keep this conservative to avoid throttle errors on large backlogs.
const CONCURRENCY = 5;

// Delay between batches in ms. Give the API time to breathe.
const BATCH_DELAY_MS = 1000;

type CharacterRow = { id: string; name: string; realm: string; region: string };

async function getUnenrichedCharacters(): Promise<CharacterRow[]> {
  // LEFT JOIN anti-join: returns only characters with no rows in characterAchievements.
  // Safer than NOT IN with a subquery, which returns no rows if the subquery yields any NULLs.
  return getDb()
    .select({
      id: characters.id,
      name: characters.name,
      realm: characters.realm,
      region: characters.region,
    })
    .from(characters)
    .leftJoin(characterAchievements, eq(characterAchievements.characterId, characters.id))
    .where(isNull(characterAchievements.characterId));
}

async function processBatch(batch: CharacterRow[]): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.allSettled(
    batch.map((char) =>
      AchievementsService.enrichAndLinkAlts(char.id, {
        name: char.name,
        realm: char.realm,
        region: char.region,
      })
    )
  );

  let succeeded = 0;
  let failed = 0;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded++;
    } else {
      failed++;
      logger.warn("Failed to enrich character", {
        character: `${batch[i]!.region}/${batch[i]!.realm}/${batch[i]!.name}`,
        error: String(result.reason),
      });
    }
  });

  return { succeeded, failed };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  initDb(config.databaseUrl);

  try {
    logger.info("Fetching unenriched characters...");
    const unenriched = await getUnenrichedCharacters();

    if (!unenriched.length) {
      logger.info("All characters already enriched — nothing to do.");
      return;
    }

    logger.info(`Found ${unenriched.length} unenriched character(s). Starting backfill...`);

    let totalSucceeded = 0;
    let totalFailed = 0;
    let processed = 0;

    for (let i = 0; i < unenriched.length; i += CONCURRENCY) {
      const batch = unenriched.slice(i, i + CONCURRENCY);
      const { succeeded, failed } = await processBatch(batch);

      totalSucceeded += succeeded;
      totalFailed += failed;
      processed += batch.length;

      logger.info(`Progress: ${processed}/${unenriched.length} — batch succeeded=${succeeded} failed=${failed}`);

      if (i + CONCURRENCY < unenriched.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    logger.info(`Backfill complete. succeeded=${totalSucceeded} failed=${totalFailed} total=${unenriched.length}`);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  logger.error("Backfill script failed", { error: String(err) });
  process.exit(1);
});
