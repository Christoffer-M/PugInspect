import { count, countDistinct, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { characters, searchEvents } from "./schema.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "DBStats" });

/** Fire-and-forget append to the search log. */
export async function recordSearchEvent(characterId: string): Promise<void> {
  try {
    await getDb().insert(searchEvents).values({ characterId });
  } catch (err) {
    logger.error("DB write failed (search event)", { characterId, error: String(err) });
  }
}

export type SiteStats = {
  totalCharacters: number;
  newCharactersThisWeek: number;
  realmsTracked: number;
  searchesToday: number;
  searchesYesterday: number;
  searchesPerDay: { date: string; count: number }[];
  regionBreakdown: { region: string; count: number }[];
  classDistribution: { class: string; count: number }[];
  recentSearches: {
    name: string;
    realm: string;
    region: string;
    class: string | null;
    specialization: string | null;
    searchedAt: string;
  }[];
  trendingCharacters: {
    name: string;
    realm: string;
    region: string;
    class: string | null;
    searches: number;
  }[];
};

export async function getSiteStats(): Promise<SiteStats> {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  // "Today" boundaries in UTC — good enough for a fun dashboard
  const todayStart = new Date(new Date().toISOString().slice(0, 10));
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const day = sql<string>`to_char(${searchEvents.searchedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

  const [
    totals,
    newThisWeek,
    todayCount,
    yesterdayCount,
    perDay,
    regions,
    classes,
    recent,
    trending,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        realms: countDistinct(sql`(${characters.region}, ${characters.realm})`),
      })
      .from(characters),
    db.select({ n: count() }).from(characters).where(gte(characters.createdAt, weekAgo)),
    db.select({ n: count() }).from(searchEvents).where(gte(searchEvents.searchedAt, todayStart)),
    db
      .select({ n: count() })
      .from(searchEvents)
      .where(
        sql`${searchEvents.searchedAt} >= ${yesterdayStart} AND ${searchEvents.searchedAt} < ${todayStart}`
      ),
    db
      .select({ date: day, count: count() })
      .from(searchEvents)
      .where(gte(searchEvents.searchedAt, fourteenDaysAgo))
      .groupBy(day)
      .orderBy(day),
    db
      .select({ region: characters.region, count: count() })
      .from(characters)
      .groupBy(characters.region)
      .orderBy(desc(count())),
    db
      .select({ class: characters.class, count: count() })
      .from(characters)
      .where(isNotNull(characters.class))
      .groupBy(characters.class)
      .orderBy(desc(count())),
    db
      .select({
        name: characters.name,
        realm: characters.realm,
        region: characters.region,
        class: characters.class,
        specialization: characters.specialization,
        searchedAt: searchEvents.searchedAt,
      })
      .from(searchEvents)
      .innerJoin(characters, eq(searchEvents.characterId, characters.id))
      .orderBy(desc(searchEvents.searchedAt))
      .limit(10),
    db
      .select({
        name: characters.name,
        realm: characters.realm,
        region: characters.region,
        class: characters.class,
        searches: count(),
      })
      .from(searchEvents)
      .innerJoin(characters, eq(searchEvents.characterId, characters.id))
      .where(gte(searchEvents.searchedAt, weekAgo))
      .groupBy(characters.id)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  return {
    totalCharacters: totals[0]?.total ?? 0,
    newCharactersThisWeek: newThisWeek[0]?.n ?? 0,
    realmsTracked: totals[0]?.realms ?? 0,
    searchesToday: todayCount[0]?.n ?? 0,
    searchesYesterday: yesterdayCount[0]?.n ?? 0,
    searchesPerDay: perDay,
    regionBreakdown: regions,
    classDistribution: classes.map((c) => ({ class: c.class!, count: c.count })),
    recentSearches: recent.map((r) => ({ ...r, searchedAt: r.searchedAt.toISOString() })),
    trendingCharacters: trending,
  };
}
