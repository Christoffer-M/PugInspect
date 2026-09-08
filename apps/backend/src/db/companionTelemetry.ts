/** Read model behind the internal companion telemetry page.
 *
 *  Everything here is shape, not presentation: dates go out as ISO strings and
 *  the page formats them. The SQL in docs/COMPANION_TELEMETRY.md is still what
 *  each field means.
 *
 *  ponytail: the whole 30-day window is pulled into memory and aggregated in
 *  JS. At twelve installs and a few hundred beats that is far less code than
 *  fifteen aggregate queries. Push the grouping into SQL if beats ever pass
 *  ~100k rows in the window. */

import { desc, gte } from "drizzle-orm";
import { getDb } from "./index.js";
import { companionBeats, companionInstalls } from "./schema.js";
import type { CompanionBeat, CompanionInstall } from "./schema.js";

const DAY = 86_400_000;
export const WINDOW_DAYS = 30;
/** Every install ever, unless there are somehow more than a page can be read at. */
const MAX_INSTALLS = 500;
/** The HUD strip stops at this many applicants; the in-game total can be higher,
 *  and the gap is the only evidence of how often the cap actually bites. */
export const STRIP_CAP = 20;
/** Beats come every 30 minutes, so a longer silence than this ends a session. */
const SESSION_GAP = 45 * 60_000;
/** Fixed display order: healthy first, then the states worth acting on. */
const LINK_ORDER = ["ok", "no_window", "addon_outdated", "incompatible", "lost", "app_outdated"] as const;
const SESSION_BUCKETS = ["30 min", "1 h", "1.5–2 h", "2 h +"] as const;

type Install = Pick<
  CompanionInstall,
  "installId" | "firstSeen" | "lastSeen" | "version" | "region" | "country" | "activatedAt"
>;
type Beat = Pick<
  CompanionBeat,
  "installId" | "at" | "version" | "link" | "applicants" | "total" | "lookups" | "lookupErrors" | "notFound" | "updateFailures" | "updatePending"
>;

export type CompanionTelemetry = ReturnType<typeof summarizeCompanionTelemetry>;

/** Newest version first. Same comparison the companion gate makes, as an
 *  ordering rather than a boolean. */
function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function tally<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

const iso = (d: Date) => d.toISOString();
const startOfDay = (ms: number) => Math.floor(ms / DAY) * DAY;

export function summarizeCompanionTelemetry(installs: Install[], beats: Beat[], now: Date) {
  const t = now.getTime();
  const windowStart = t - WINDOW_DAYS * DAY;
  const weekAgo = t - 7 * DAY;
  const beats7 = beats.filter((b) => b.at.getTime() >= weekAgo);

  const byInstall = new Map<string, Beat[]>();
  for (const b of beats) {
    const list = byInstall.get(b.installId);
    if (list) list.push(b);
    else byInstall.set(b.installId, [b]);
  }
  for (const list of byInstall.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime());
  const lastBeat = new Map([...byInstall].map(([id, list]) => [id, list[list.length - 1]!]));

  // activated_at is set the first time an install decodes a frame and is never
  // cleared, so "ever activated" is just its presence.
  const activated = installs.filter((i) => i.activatedAt !== null);
  const funnel = {
    installs: installs.length,
    activated: activated.length,
    activeThisWeek: activated.filter((i) => i.lastSeen.getTime() >= weekAgo).length,
    never: installs.length - activated.length,
    // Of the ones that never activated, how many last reported the game simply
    // not being there — the signature of a strip that was never turned on.
    neverNoWindow: installs.filter((i) => i.activatedAt === null && lastBeat.get(i.installId)?.link === "no_window").length,
  };

  const links = LINK_ORDER.map((link) => {
    const rows = beats7.filter((b) => b.link === link);
    return { link, beats: rows.length, installs: new Set(rows.map((r) => r.installId)).size };
  });

  // One point per day, cumulative. A stepped line reads a dozen install events
  // honestly; a smoothed curve would invent a trend that isn't there.
  const growth = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => {
    const at = windowStart + i * DAY;
    return { date: iso(new Date(at)), count: installs.filter((x) => x.firstSeen.getTime() <= at).length };
  });

  const versions = [...tally(installs, (i) => i.version)]
    .sort((a, b) => cmpVersion(a[0], b[0]))
    .map(([version, count]) => ({ version, count }));

  // A successful update relaunches the app, so success is never reported. What
  // a beat can say is "knows about a newer build and is still on this one".
  const strandedGroups = new Map<string, { from: string; to: string; installs: number; failures: number }>();
  for (const install of installs) {
    const last = lastBeat.get(install.installId);
    if (!last?.updatePending) continue;
    const key = `${last.version}>${last.updatePending}`;
    const group = strandedGroups.get(key) ?? { from: last.version, to: last.updatePending, installs: 0, failures: 0 };
    group.installs += 1;
    group.failures += (byInstall.get(install.installId) ?? []).reduce((sum, b) => sum + b.updateFailures, 0);
    strandedGroups.set(key, group);
  }
  const stranded = [...strandedGroups.values()].sort((a, b) => cmpVersion(b.from, a.from));

  // Weekly cohorts counted back from today. "Returned on day N" means the
  // install was still sending beats N days after it first appeared.
  const cohorts = [3, 2, 1, 0].map((weeksBack) => {
    const start = t - (weeksBack + 1) * 7 * DAY;
    const end = t - weeksBack * 7 * DAY;
    const members = installs.filter((i) => i.firstSeen.getTime() >= start && i.firstSeen.getTime() < end);
    const returned = (days: number) =>
      members.filter((i) => (byInstall.get(i.installId) ?? []).some((b) => b.at.getTime() >= i.firstSeen.getTime() + days * DAY)).length;
    return {
      start: iso(new Date(start)),
      end: iso(new Date(end - DAY)),
      size: members.length,
      day1: returned(1),
      day7: returned(7),
      // The newest bucket holds installs 0–7 days old, so no member of it can
      // have a day-7 number yet. Everything older is fully measured.
      pending: weeksBack === 0,
      daysToWait: members.length
        ? Math.max(1, Math.ceil(7 - (t - Math.max(...members.map((i) => i.firstSeen.getTime()))) / DAY))
        : 0,
    };
  });

  const runtime = Array.from({ length: 14 }, (_, i) => {
    const dayStart = startOfDay(t - (13 - i) * DAY);
    return {
      date: iso(new Date(dayStart)),
      count: beats.filter((b) => b.at.getTime() >= dayStart && b.at.getTime() < dayStart + DAY).length,
    };
  });

  // Sessions are runs of consecutive beats from one install. A run shorter than
  // a single beat interval reports nothing at all, so it can't appear here.
  const sessionLengths: number[] = [];
  for (const list of byInstall.values()) {
    let run = 0;
    let prev = 0;
    for (const b of list) {
      if (run && b.at.getTime() - prev > SESSION_GAP) {
        sessionLengths.push(run);
        run = 0;
      }
      run += 1;
      prev = b.at.getTime();
    }
    if (run) sessionLengths.push(run);
  }
  const bucketOf = (beatCount: number) => (beatCount === 1 ? "30 min" : beatCount === 2 ? "1 h" : beatCount <= 4 ? "1.5–2 h" : "2 h +");
  const sessions = SESSION_BUCKETS.map((bucket) => ({
    bucket,
    percent: sessionLengths.length ? Math.round((sessionLengths.filter((n) => bucketOf(n) === bucket).length / sessionLengths.length) * 100) : 0,
  }));

  // Counters are deltas since each install's previous report, so summing them
  // over a window is that window's traffic, not a lifetime total.
  const lookups = {
    total: beats7.reduce((sum, b) => sum + b.lookups, 0),
    notFound: beats7.reduce((sum, b) => sum + b.notFound, 0),
    errors: beats7.reduce((sum, b) => sum + b.lookupErrors, 0),
  };

  const cappedBeats = beats7.filter((b) => b.applicants >= STRIP_CAP);
  const cap = {
    limit: STRIP_CAP,
    beats: cappedBeats.length,
    installs: new Set(cappedBeats.map((b) => b.installId)).size,
    maxTotal: cappedBeats.reduce((max, b) => Math.max(max, b.total), 0),
  };

  const rows = [...installs]
    .sort((a, b) => b.firstSeen.getTime() - a.firstSeen.getTime())
    .map((i) => ({
      // A prefix is enough to tell rows apart and to grep the logs with; the
      // full UUID is the only identifier this data has, so it stays in the DB.
      installId: i.installId.slice(0, 4),
      firstSeen: iso(i.firstSeen),
      lastSeen: iso(i.lastSeen),
      version: i.version,
      region: i.region,
      country: i.country,
      activatedAt: i.activatedAt ? iso(i.activatedAt) : null,
      link: lastBeat.get(i.installId)?.link ?? null,
    }));

  const regions = [...tally(installs, (i) => i.region ?? "null")]
    .sort((a, b) => b[1] - a[1])
    .map(([region, count]) => ({ region, count }));
  const countries = [...tally(installs.filter((i) => i.country), (i) => i.country!)]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country, count]) => ({ country, count }));

  return {
    windowDays: WINDOW_DAYS,
    newestReport: installs.length ? iso(new Date(Math.max(...installs.map((i) => i.lastSeen.getTime())))) : null,
    funnel,
    links,
    beatsThisWeek: beats7.length,
    growth,
    newThisWindow: installs.filter((i) => i.firstSeen.getTime() >= windowStart).length,
    versions,
    stranded,
    cohorts,
    runtime,
    runtimeBeats: runtime.reduce((sum, d) => sum + d.count, 0),
    sessions,
    lookups,
    cap,
    installs: rows,
    regions,
    countries,
  };
}

export async function getCompanionTelemetry(now = new Date()): Promise<CompanionTelemetry> {
  const db = getDb();
  const [installs, beats] = await Promise.all([
    db.select().from(companionInstalls).orderBy(desc(companionInstalls.firstSeen)).limit(MAX_INSTALLS),
    db.select().from(companionBeats).where(gte(companionBeats.at, new Date(now.getTime() - WINDOW_DAYS * DAY))),
  ]);
  return summarizeCompanionTelemetry(installs, beats, now);
}
