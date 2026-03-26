import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

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
    console.log("[db] Running migrations from", migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log("[db] Migrations complete");
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Standalone entry point: `node dist/db/migrate.js`
// Only executes when this file is run directly (not imported as a module).
// ---------------------------------------------------------------------------
if (process.argv[1] === __filename) {
  // Lazy-load dotenv so the module stays lightweight when imported elsewhere
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: resolve(__dirname, "../../.env") });

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[db] DATABASE_URL is not set");
    process.exit(1);
  }

  await runMigrations(url).catch((err: unknown) => {
    console.error("[db] Migration failed:", err);
    process.exit(1);
  });
}
