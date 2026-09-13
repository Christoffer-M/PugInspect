import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DB" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all pending Drizzle migrations against the given database URL.
 * Uses a dedicated single-connection pool so it can be called from both
 * application startup (where the main pool already exists) and the
 * standalone CLI script below.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool });
  // __dirname is dist/db/ at runtime; migrations live two levels up in drizzle/
  const migrationsFolder = resolve(__dirname, "../../drizzle");

  try {
    logger.info("Running migrations", { migrationsFolder });
    await migrate(db, { migrationsFolder });
    logger.info("Migrations complete");
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Standalone entry point: `node dist/db/migrate.js`
// Only executes when this file is run directly (not imported as a module).
// ---------------------------------------------------------------------------
if (process.argv[1] === __filename) {
  // .env is optional — in Docker, env vars come from the environment itself
  try {
    process.loadEnvFile(resolve(__dirname, "../../.env"));
  } catch {}

  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.error("DATABASE_URL is not set");
    process.exit(1);
  }

  await runMigrations(url).catch((err: unknown) => {
    logger.error("Migration failed", { error: String(err) });
    process.exit(1);
  });
}
