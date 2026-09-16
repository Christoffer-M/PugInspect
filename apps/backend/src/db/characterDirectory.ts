import { and, count, desc, eq, inArray, like, sql } from "drizzle-orm";
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

/**
 * Autocomplete: characters in a region whose name starts with `namePrefix`,
 * optionally within the given realms. Exact name matches rank first, then
 * whoever played most recently. `namePrefix` must already be normalized.
 */
export async function searchDirectory(
  region: string,
  namePrefix: string,
  realms: string[] | null,
  limit = 10
): Promise<{ realm: string; name: string }[]> {
  const pattern = `${namePrefix.replace(/[\\%_]/g, "\\$&")}%`;
  return getDb()
    .select({ realm: characterDirectory.realm, name: characterDirectory.name })
    .from(characterDirectory)
    .where(
      and(
        eq(characterDirectory.region, region),
        like(characterDirectory.name, pattern),
        realms ? inArray(characterDirectory.realm, realms) : undefined
      )
    )
    .orderBy(sql`${characterDirectory.name} <> ${namePrefix}`, desc(characterDirectory.lastSeenAt))
    .limit(limit);
}

/** How many characters we know per region — the crawl publishes this so the
 *  autocomplete board can show the directory growing. */
export async function directorySizes(): Promise<{ region: string; rows: number }[]> {
  return getDb()
    .select({ region: characterDirectory.region, rows: count() })
    .from(characterDirectory)
    .groupBy(characterDirectory.region);
}
