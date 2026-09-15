import { max, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { characterDirectory } from "./schema.js";
import type { NewCharacterDirectoryEntry } from "./schema.js";

/**
 * Upsert directory entries. Rows must be unique per (region, realm, name) —
 * Postgres rejects an ON CONFLICT statement that touches the same row twice.
 * A crawl can revisit a character through an older run, so neither
 * lastSeenAt nor the spec it played is allowed to move backwards.
 */
export async function upsertDirectory(rows: NewCharacterDirectoryEntry[]): Promise<void> {
  const db = getDb();
  // Chunked against Postgres's 65,535 bind-parameter cap (4 per row); the loop
  // also makes an empty realm a no-op, where .values([]) would throw.
  for (let i = 0; i < rows.length; i += 1000) {
    await db
      .insert(characterDirectory)
      .values(rows.slice(i, i + 1000))
      .onConflictDoUpdate({
        target: [characterDirectory.region, characterDirectory.realm, characterDirectory.name],
        set: {
          specId: sql`CASE WHEN excluded.last_seen_at >= character_directory.last_seen_at THEN excluded.spec_id ELSE character_directory.spec_id END`,
          lastSeenAt: sql`GREATEST(excluded.last_seen_at, character_directory.last_seen_at)`,
          updatedAt: sql`now()`,
        },
      });
  }
}

/** When the directory was last written to, or null if it is empty. */
export async function getDirectoryUpdatedAt(): Promise<Date | null> {
  const [row] = await getDb().select({ at: max(characterDirectory.updatedAt) }).from(characterDirectory);
  return row?.at ?? null;
}
