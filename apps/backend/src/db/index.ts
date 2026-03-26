import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Initialise the connection pool and Drizzle instance.
 * Call this once at application startup after loading config.
 */
export function initDb(databaseUrl: string): void {
  _pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

  _pool.on("error", (err) => {
    console.error("[db] Unexpected pool error:", err.message);
  });

  _db = drizzle({ client: _pool, schema });
}

/** Returns the Drizzle db instance. Throws if initDb has not been called. */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) throw new Error("Database not initialised — call initDb() first");
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
