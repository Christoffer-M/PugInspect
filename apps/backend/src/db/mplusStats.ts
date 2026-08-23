import { eq, inArray } from "drizzle-orm";
import { getDb } from "./index.js";
import { mplusSpecStats, mplusStatsMeta } from "./schema.js";
import type { MplusSpecStat, MplusStatsMeta, NewMplusSpecStat } from "./schema.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "MythicPlusStatsDB" });

/**
 * Replace a zone's stats wholesale. The crawler always produces a complete
 * picture, so a partial update would leave rows from a previous season's
 * dungeons or a since-emptied keystone scope hanging around.
 */
export async function replaceMplusStats(
  zoneId: number,
  rows: NewMplusSpecStat[],
  meta: Omit<MplusStatsMeta, "refreshedAt">
): Promise<boolean> {
  try {
    const db = getDb();
    const refreshedAt = new Date();
    await db.transaction(async (tx) => {
      await tx.delete(mplusSpecStats).where(eq(mplusSpecStats.zoneId, zoneId));
      // Chunked: a full refresh is a few thousand rows and Postgres caps
      // bind parameters per statement.
      for (let i = 0; i < rows.length; i += 500) {
        await tx.insert(mplusSpecStats).values(
          rows.slice(i, i + 500).map((r) => ({ ...r, refreshedAt }))
        );
      }
      await tx
        .insert(mplusStatsMeta)
        .values({ ...meta, refreshedAt })
        .onConflictDoUpdate({
          target: mplusStatsMeta.zoneId,
          set: { ...meta, refreshedAt },
        });
    });
    return true;
  } catch (err) {
    logger.error("Failed to persist Mythic+ spec stats", { zoneId, error: String(err) });
    return false;
  }
}

export async function getMplusStatsMeta(zoneId: number): Promise<MplusStatsMeta | null> {
  try {
    const [row] = await getDb()
      .select()
      .from(mplusStatsMeta)
      .where(eq(mplusStatsMeta.zoneId, zoneId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    logger.error("DB query failed (getMplusStatsMeta)", { zoneId, error: String(err) });
    return null;
  }
}

/**
 * Every stat row for a zone — pooled and per-dungeon — in one round trip.
 * Only one keystone scope is ever written per zone, so no floor filter is
 * needed; rows carry their own keyFloor.
 */
export async function getMplusStats(zoneId: number): Promise<MplusSpecStat[]> {
  try {
    return await getDb()
      .select()
      .from(mplusSpecStats)
      .where(eq(mplusSpecStats.zoneId, zoneId));
  } catch (err) {
    logger.error("DB query failed (getMplusStats)", { zoneId, error: String(err) });
    return [];
  }
}

export async function getMplusZonesWithStats(zoneIds: number[]): Promise<number[]> {
  if (zoneIds.length === 0) return [];
  try {
    const rows = await getDb()
      .select({ zoneId: mplusStatsMeta.zoneId })
      .from(mplusStatsMeta)
      .where(inArray(mplusStatsMeta.zoneId, zoneIds));
    return rows.map((r) => r.zoneId);
  } catch (err) {
    logger.error("DB query failed (getMplusZonesWithStats)", { error: String(err) });
    return [];
  }
}
