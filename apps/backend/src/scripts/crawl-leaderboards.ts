/**
 * Run one Mythic+ leaderboard pass into character_directory. The scheduler
 * only runs in production, so plain runs seed a local database; --periods=all
 * backfills every week of the current season (once per season, a few hours).
 *
 *   pnpm crawl:leaderboards [--periods=all]
 */

import { config } from "../config/index.js";
import { initDb, closeDb } from "../db/index.js";
import { crawlLeaderboards } from "../schema/services/blizzard/leaderboardCrawler.js";

initDb(config.databaseUrl);
try {
  await crawlLeaderboards({ allPeriods: process.argv.includes("--periods=all") });
} finally {
  await closeDb();
}
