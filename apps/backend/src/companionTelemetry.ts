/** Internal operations view over the companion telemetry tables.
 *
 *  Server-rendered HTML rather than a route in the SPA: nothing here is public,
 *  it needs no interactivity beyond two charts, and a GraphQL field plus a
 *  React page would be four files and a codegen run to show the same numbers.
 *
 *  ponytail: the whole 30-day window is pulled into memory and aggregated in
 *  JS. At twelve installs and a few hundred beats that is far less code than
 *  fifteen aggregate queries. Push the grouping into SQL if beats ever pass
 *  ~100k rows in the window. */

import { desc, gte } from "drizzle-orm";
import { getDb } from "./db/index.js";
import { companionBeats, companionInstalls } from "./db/schema.js";
import type { CompanionBeat, CompanionInstall } from "./db/schema.js";

const DAY = 86_400_000;
const WINDOW_DAYS = 30;
/** Every install ever, unless there are somehow more than a page can be read at. */
const MAX_INSTALLS = 500;
/** The HUD strip stops at this many applicants; the in-game total can be higher,
 *  and the gap is the only evidence of how often the cap actually bites. */
const STRIP_CAP = 20;
/** Beats come every 30 minutes, so a longer silence than this ends a session. */
const SESSION_GAP = 45 * 60_000;

/** Fixed display order: healthy first, then the states worth acting on. */
const LINK_ORDER = ["ok", "no_window", "addon_outdated", "incompatible", "lost", "app_outdated"] as const;

type Install = Pick<
  CompanionInstall,
  "installId" | "firstSeen" | "lastSeen" | "version" | "region" | "country" | "activatedAt"
>;
type Beat = Pick<
  CompanionBeat,
  "installId" | "at" | "version" | "link" | "applicants" | "total" | "lookups" | "lookupErrors" | "notFound" | "updateFailures" | "updatePending"
>;

// ---------------------------------------------------------------- aggregation

/** Newest version first. Same shape as the companion gate's comparison, but
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

  // Activation funnel. activatedAt is set the first time an install decodes a
  // frame and never cleared, so "ever activated" is just its presence.
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

  // One point per day, cumulative. A stepped line reads twelve install events
  // honestly; a smoothed curve would invent a trend that isn't there.
  const growth = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => {
    const at = windowStart + i * DAY;
    return { label: fmtDay(new Date(at)), value: installs.filter((x) => x.firstSeen.getTime() <= at).length };
  });
  const newInWindow = installs.filter((i) => i.firstSeen.getTime() >= windowStart).length;

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
  const strandedTotal = stranded.reduce((sum, g) => sum + g.installs, 0);

  // Weekly cohorts counted back from today. "Returned on day N" means the
  // install was still sending beats N days after it first appeared.
  const cohorts = [3, 2, 1, 0].map((weeksBack) => {
    const start = t - (weeksBack + 1) * 7 * DAY;
    const end = t - weeksBack * 7 * DAY;
    const members = installs.filter((i) => i.firstSeen.getTime() >= start && i.firstSeen.getTime() < end);
    const returned = (days: number) =>
      members.filter((i) => (byInstall.get(i.installId) ?? []).some((b) => b.at.getTime() >= i.firstSeen.getTime() + days * DAY)).length;
    return {
      label: fmtRange(new Date(start), new Date(end - DAY)),
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
    const dayStart = Math.floor((t - (13 - i) * DAY) / DAY) * DAY;
    return {
      label: fmtDay(new Date(dayStart)),
      value: beats.filter((b) => b.at.getTime() >= dayStart && b.at.getTime() < dayStart + DAY).length,
    };
  });
  const runtimeBeats = runtime.reduce((sum, d) => sum + d.value, 0);

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
  const sessions = ["30 min", "1 h", "1.5–2 h", "2 h +"].map((bucket) => ({
    bucket,
    pct: sessionLengths.length ? Math.round((sessionLengths.filter((n) => bucketOf(n) === bucket).length / sessionLengths.length) * 100) : 0,
  }));

  // Counters are deltas since each install's previous report, so summing them
  // over a window is the window's traffic, not a lifetime total.
  const lookups = {
    total: beats7.reduce((sum, b) => sum + b.lookups, 0),
    notFound: beats7.reduce((sum, b) => sum + b.notFound, 0),
    errors: beats7.reduce((sum, b) => sum + b.lookupErrors, 0),
  };

  const cappedBeats = beats7.filter((b) => b.applicants >= STRIP_CAP);
  const cap = {
    beats: cappedBeats.length,
    installs: new Set(cappedBeats.map((b) => b.installId)).size,
    pct: beats7.length ? Math.round((cappedBeats.length / beats7.length) * 100) : 0,
    maxTotal: cappedBeats.reduce((max, b) => Math.max(max, b.total), 0),
  };

  const rows = [...installs]
    .sort((a, b) => b.firstSeen.getTime() - a.firstSeen.getTime())
    .map((i) => ({
      id: i.installId.slice(0, 4),
      firstSeen: fmtDay(i.firstSeen),
      lastSeen: fmtTime(i.lastSeen),
      stale: i.lastSeen.getTime() < weekAgo,
      version: i.version,
      region: i.region,
      country: i.country,
      activated: i.activatedAt ? fmtDay(i.activatedAt) : null,
      link: lastBeat.get(i.installId)?.link ?? null,
    }));

  const regions = [...tally(installs, (i) => i.region ?? "null")]
    .sort((a, b) => b[1] - a[1])
    .map(([region, count]) => ({ region, count }));
  const countries = [...tally(installs.filter((i) => i.country), (i) => i.country!)]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country, count]) => ({ country, count }));

  return {
    newestReport: installs.length ? fmtTime(new Date(Math.max(...installs.map((i) => i.lastSeen.getTime())))) : "never",
    funnel,
    links,
    beats7: beats7.length,
    growth,
    newInWindow,
    versions,
    stranded,
    strandedTotal,
    cohorts,
    runtime,
    runtimeBeats,
    sessions,
    lookups,
    cap,
    rows,
    regions,
    countries,
  };
}

export async function getCompanionTelemetry(now = new Date()) {
  const db = getDb();
  const [installs, beats] = await Promise.all([
    db.select().from(companionInstalls).orderBy(desc(companionInstalls.firstSeen)).limit(MAX_INSTALLS),
    db.select().from(companionBeats).where(gte(companionBeats.at, new Date(now.getTime() - WINDOW_DAYS * DAY))),
  ]);
  return summarizeCompanionTelemetry(installs, beats, now);
}

// ------------------------------------------------------------------ rendering

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
const fmtTime = (d: Date) => `${fmtDay(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
/** "11–17 Aug" within a month, "28 Aug–3 Sep" across one. */
const fmtRange = (from: Date, to: Date) =>
  from.getUTCMonth() === to.getUTCMonth() ? `${from.getUTCDate()}–${fmtDay(to)}` : `${fmtDay(from)}–${fmtDay(to)}`;
const num = (n: number) => n.toLocaleString("en-GB");

/** Every value on this page comes from columns the beat parser has already
 *  constrained to a fixed set or a regex, so nothing here is free text. Escaped
 *  anyway — the page's inputs arrive from a public endpoint. */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const ACCENT = "#8b7fd4";
const GREEN = "#22c55e";
const AMBER = "#f4a50e";
const RED = "#f87171";
const DIM = "#8a96aa";
const MUTED = "#b6c0d2";
const BRIGHT = "#e8ecf4";
const BORDER = "rgba(61,79,110,.5)";
const PANEL = "background:linear-gradient(180deg,rgba(18,30,54,.55),rgba(10,18,34,.75));border:1px solid rgba(61,79,110,.5);border-radius:10px";

/** Same region palette the public stats page uses, so the two read as one product. */
const REGION_COLORS: Record<string, string> = { eu: "#8b7cf6", us: "#22d3ee", kr: "#4ade80", tw: "#fb923c", cn: "#f472b6" };
const regionColor = (region: string | null) => (region && REGION_COLORS[region]) || DIM;
const linkColor = (link: string | null) =>
  link === "ok" ? GREEN : link === "no_window" || link === "lost" ? AMBER : link === null ? DIM : RED;
/** Newest build is fine, one behind is worth watching, anything older is stuck. */
const versionColor = (index: number) => (index === 0 ? ACCENT : index === 1 ? AMBER : RED);

const label = (text: string) =>
  `<div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${DIM}">${text}</div>`;
const note = (html: string) =>
  `<div style="font-size:11.5px;line-height:1.5;color:${DIM};border-top:1px solid ${BORDER};padding-top:10px">${html}</div>`;

/** label | proportion bar | value. Not a chart — a table with a bar column, and
 *  the value cell carries mixed units a chart library would have to be fought
 *  into rendering. The two real plots below use Chart.js. */
function barRow(name: string, color: string, pct: number, value: string, cols = "112px 1fr 100px") {
  return `<div style="display:grid;grid-template-columns:${cols};align-items:center;gap:10px">
<div style="font-family:var(--mono);font-size:12px;color:${color}">${esc(name)}</div>
<div style="height:8px;background:rgba(37,51,84,.7);border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:8px;background:${color}"></div></div>
<div style="font-family:var(--mono);font-size:11.5px;color:${MUTED};text-align:right">${esc(value)}</div></div>`;
}

function funnelStep(name: string, value: string, color: string, sub: string, aside = "") {
  return `<div style="flex:1;display:flex;flex-direction:column;gap:6px;background:rgba(37,51,84,.5);border:1px solid ${BORDER};border-radius:8px;padding:14px 16px">
<div style="font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:${DIM}">${name}</div>
<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--mono);font-size:44px;line-height:1;font-weight:600;color:${color}">${value}</div>${
    aside ? `<div style="font-family:var(--mono);font-size:14px;color:${DIM}">${aside}</div>` : ""
  }</div>
<div style="font-size:12px;color:${MUTED}">${sub}</div></div>`;
}

const arrow = `<div style="display:flex;align-items:center;font-family:var(--mono);font-size:18px;color:#3d4f6e">→</div>`;

export function renderCompanionTelemetryHtml(d: ReturnType<typeof summarizeCompanionTelemetry>): string {
  const maxLink = Math.max(1, ...d.links.map((l) => l.beats));
  const maxVersion = Math.max(1, ...d.versions.map((v) => v.count));
  const maxRegion = Math.max(1, ...d.regions.map((r) => r.count));
  const lookupOk = d.lookups.total - d.lookups.notFound - d.lookups.errors;
  const pctOf = (n: number, total: number) => (total ? (n / total) * 100 : 0);
  const newest = d.cohorts[3]!;
  const complete = d.cohorts.slice(0, 3);

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Companion telemetry · PugInspect</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;500;600&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js" integrity="sha384-XcdcwHqIPULERb2yDEM4R0XaQKU3YnDsrTmjACBZyfdVVqjh6xQ4/DCMd7XLcA6Y" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<style>
:root{--mono:'JetBrains Mono',ui-monospace,Menlo,monospace}
body{margin:0;background:#0f1d35;color:${BRIGHT};font-family:Inter,system-ui,sans-serif}
.wrap{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;gap:16px;padding:32px 40px 40px}
.grid{display:grid;gap:16px}
</style>
</head><body><div class="wrap">

<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;border-bottom:1px solid ${BORDER};padding-bottom:18px">
<div style="display:flex;flex-direction:column;gap:6px">
<div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:22px;font-weight:700;letter-spacing:-.01em">Companion telemetry</div>
<div style="font-size:12.5px;color:${DIM}">Internal · anonymous install reports, 30-minute heartbeats</div>
</div>
<div style="display:flex;gap:28px;text-align:right">
<div style="display:flex;flex-direction:column;gap:3px"><div style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:${DIM}">Window</div><div style="font-family:var(--mono);font-size:13px">Last ${WINDOW_DAYS} days</div></div>
<div style="display:flex;flex-direction:column;gap:3px"><div style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:${DIM}">Newest report</div><div style="font-family:var(--mono);font-size:13px">${esc(d.newestReport)} UTC</div></div>
</div>
</div>

<div class="grid" style="grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);${PANEL};padding:20px 22px">
<div style="display:flex;flex-direction:column;gap:16px">
${label("Activation funnel")}
<div style="display:flex;align-items:stretch;gap:14px">
${funnelStep("Installs", String(d.funnel.installs), BRIGHT, "all-time")}
${arrow}
${funnelStep("Ever activated", String(d.funnel.activated), GREEN, "read the game at least once", `${Math.round(pctOf(d.funnel.activated, d.funnel.installs))}%`)}
${arrow}
${funnelStep("Active this week", String(d.funnel.activeThisWeek), BRIGHT, "activated and seen in the last 7 days", `of ${d.funnel.activated}`)}
</div>
${
  d.funnel.never
    ? `<div style="display:flex;align-items:center;gap:16px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.35);border-radius:8px;padding:14px 18px">
<div style="font-family:var(--mono);font-size:44px;line-height:1;font-weight:600;color:${RED}">${d.funnel.never}</div>
<div style="display:flex;flex-direction:column;gap:3px">
<div style="font-size:14px;font-weight:600;color:#fecdcd">never got it working</div>
<div style="font-size:12.5px;line-height:1.45;color:#e3b3b3;max-width:460px">${d.funnel.never} of ${d.funnel.installs} installs have <span style="font-family:var(--mono)">activated_at IS NULL</span> — they ran the app but never read a single applicant.${
        d.funnel.neverNoWindow
          ? ` ${d.funnel.neverNoWindow} of them last reported <span style="font-family:var(--mono)">no_window</span>, which is the strip never being enabled with <span style="font-family:var(--mono)">/pi hud</span>.`
          : ""
      }</div></div></div>`
    : ""
}
</div>
<div style="display:flex;flex-direction:column;gap:12px;border-left:1px solid ${BORDER};padding-left:20px">
<div style="display:flex;align-items:baseline;justify-content:space-between">
${label("Why capture fails")}
<div style="font-size:11px;color:${DIM}">${num(d.beats7)} beats · 7 days</div>
</div>
<div style="display:flex;flex-direction:column;gap:9px">
${d.links
  .map((l) =>
    barRow(
      l.link,
      l.beats === 0 ? DIM : linkColor(l.link),
      pctOf(l.beats, maxLink),
      l.beats ? `${num(l.beats)} · ${l.installs} inst` : "0"
    )
  )
  .join("\n")}
</div>
${note(
  `<span style="color:${AMBER}">no_window</span> is a game-not-running problem. <span style="color:${RED}">addon_outdated / incompatible</span> is a version mismatch you can fix by shipping. <span style="color:${AMBER}">lost</span> broke mid-session.`
)}
</div>
</div>

<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;align-items:baseline;justify-content:space-between">
${label(`Installs over ${WINDOW_DAYS} days`)}
<div style="font-family:var(--mono);font-size:12px;color:${MUTED}">+${d.newInWindow} new · ${d.funnel.installs} total</div>
</div>
<div style="height:150px"><canvas id="growth"></canvas></div>
${note("One step per install. Read the steps, not a curve.")}
</div>
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
${label("Versions &amp; stranded installs")}
<div style="display:flex;flex-direction:column;gap:8px">
${d.versions.map((v, i) => barRow(v.version, versionColor(i), pctOf(v.count, maxVersion), String(v.count), "56px 1fr 30px")).join("\n")}
</div>
${
  d.strandedTotal
    ? `<div style="display:flex;flex-direction:column;gap:8px;background:rgba(244,165,14,.08);border:1px solid rgba(244,165,14,.35);border-radius:8px;padding:12px 14px">
<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--mono);font-size:26px;line-height:1;font-weight:600;color:${AMBER}">${d.strandedTotal}</div><div style="font-size:12.5px;font-weight:600;color:#f6d79b">stranded on an old build</div></div>
<div style="display:flex;flex-direction:column;gap:5px;font-family:var(--mono);font-size:11.5px;color:#e8d3ab">
${d.stranded
  .map(
    (g) =>
      `<div>${esc(g.from)} → pending ${esc(g.to)} · ${g.installs} install${g.installs === 1 ? "" : "s"}${
        g.failures ? ` · ${g.failures} update_failures` : ""
      }</div>`
  )
  .join("\n")}
</div></div>`
    : ""
}
${note("A successful update relaunches the app, so success is never reported. Pending and failed states are all this table can see.")}
</div>
</div>

<div class="grid" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(0,.85fr)">
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;align-items:baseline;justify-content:space-between">
${label("Do they come back")}
<div style="font-size:11px;color:${DIM}">weekly cohorts</div>
</div>
<div style="display:grid;grid-template-columns:1fr 74px 74px;gap:8px 10px;align-items:center">
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM}">Cohort</div>
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM};text-align:right">Day 1</div>
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM};text-align:right">Day 7</div>
${complete
  .map((c) => {
    const cell = (n: number) =>
      `<div style="font-family:var(--mono);font-size:13px;text-align:right;color:${
        c.size && n / c.size >= 0.5 ? GREEN : c.size ? AMBER : DIM
      }">${c.size ? `${n} of ${c.size}` : "—"}</div>`;
    return `<div style="font-family:var(--mono);font-size:12.5px;color:${MUTED}">${esc(c.label)} · ${c.size}</div>${cell(c.day1)}${cell(c.day7)}`;
  })
  .join("\n")}
</div>
<div style="display:flex;align-items:center;gap:14px;border:1px dashed rgba(61,79,110,.8);border-radius:8px;padding:14px 16px">
<div style="display:flex;flex-direction:column;gap:2px"><div style="font-family:var(--mono);font-size:12.5px;color:${MUTED};white-space:nowrap">${esc(newest.label)} · ${newest.size}</div><div style="font-size:11.5px;color:${DIM}">day 1: ${newest.size ? `${newest.day1} of ${newest.size}` : "—"}</div></div>
<div style="width:1px;align-self:stretch;background:rgba(61,79,110,.6)"></div>
<div style="display:flex;flex-direction:column;gap:2px"><div style="font-family:var(--mono);font-size:16px;color:${DIM}">day 7 — not yet</div><div style="font-size:11.5px;color:${DIM}">${
    newest.size
      ? `the newest cohort needs ${newest.daysToWait} more day${newest.daysToWait === 1 ? "" : "s"} before this cell means anything`
      : "no installs joined this week"
  }</div></div>
</div>
</div>

<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;align-items:baseline;justify-content:space-between">
${label("Runtime")}
<div style="font-family:var(--mono);font-size:12px;color:${MUTED}">${num(d.runtimeBeats)} beats · 14 d</div>
</div>
<div style="height:110px"><canvas id="runtime"></canvas></div>
<div style="display:flex;flex-direction:column;gap:7px;border-top:1px solid ${BORDER};padding-top:12px">
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM}">Inferred session length</div>
${d.sessions.map((s) => barRow(s.bucket, ACCENT, s.pct, `${s.pct}%`, "64px 1fr 34px")).join("\n")}
<div style="font-size:11.5px;line-height:1.5;color:${DIM}">Buckets of 30 minutes, inferred from consecutive beats. A run shorter than one beat reports nothing at all.</div>
</div>
</div>

<div style="display:flex;flex-direction:column;gap:16px">
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
${label("Lookup health · 7 d")}
<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--mono);font-size:30px;line-height:1;font-weight:600">${num(d.lookups.total)}</div><div style="font-size:12px;color:${DIM}">characters looked up</div></div>
<div style="display:flex;height:10px;border-radius:4px;overflow:hidden;background:rgba(37,51,84,.7)"><div style="width:${pctOf(lookupOk, d.lookups.total)}%;background:${GREEN}"></div><div style="width:${pctOf(d.lookups.notFound, d.lookups.total)}%;background:${AMBER}"></div><div style="width:${pctOf(d.lookups.errors, d.lookups.total)}%;background:${RED}"></div></div>
<div style="display:flex;flex-direction:column;gap:6px">
<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px"><span style="color:${AMBER}">not_found</span><span style="color:${MUTED}">${num(d.lookups.notFound)} · ${pctOf(d.lookups.notFound, d.lookups.total).toFixed(1)}%</span></div>
<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px"><span style="color:${RED}">lookup_errors</span><span style="color:${MUTED}">${num(d.lookups.errors)} · ${pctOf(d.lookups.errors, d.lookups.total).toFixed(1)}%</span></div>
</div>
${note("Deltas since each install's previous report, summed. Not lifetime totals.")}
</div>
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:10px">
${label(`${STRIP_CAP}-applicant cap`)}
<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--mono);font-size:30px;line-height:1;font-weight:600;color:${AMBER}">${d.cap.pct}%</div><div style="font-size:12px;color:${MUTED}">of beats hit the cap</div></div>
<div style="font-family:var(--mono);font-size:12px;color:${MUTED}">${num(d.cap.beats)} of ${num(d.beats7)} beats · ${d.cap.installs} of ${d.funnel.installs} installs</div>
<div style="font-size:11.5px;line-height:1.5;color:${DIM}">Highest <span style="font-family:var(--mono)">total</span> seen while capped at ${STRIP_CAP}: <span style="font-family:var(--mono);color:${BRIGHT}">${d.cap.maxTotal}</span>.</div>
</div>
</div>
</div>

<div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(0,1fr)">
<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;align-items:baseline;justify-content:space-between">
${label("Every install")}
<div style="font-size:11px;color:${DIM}">${d.rows.length} rows · newest first · no names or characters exist in this data</div>
</div>
<div style="display:grid;grid-template-columns:88px 96px 116px 62px 74px 116px 128px;gap:0 14px;align-items:center;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM};border-bottom:1px solid ${BORDER};padding-bottom:8px">
<div>install</div><div>first seen</div><div>last seen</div><div>version</div><div>region</div><div>activated</div><div>last link state</div>
</div>
<div style="display:flex;flex-direction:column">
${d.rows
  .map(
    (r, i) => `<div style="display:grid;grid-template-columns:88px 96px 116px 62px 74px 116px 128px;gap:0 14px;align-items:center;padding:9px 0;${
      i === d.rows.length - 1 ? "" : "border-bottom:1px solid rgba(61,79,110,.22);"
    }font-family:var(--mono);font-size:12px;color:${MUTED}">
<div style="color:${BRIGHT}">${esc(r.id)}…</div>
<div>${esc(r.firstSeen)}</div>
<div${r.stale ? ` style="color:${DIM}"` : ""}>${esc(r.lastSeen)}</div>
<div style="color:${versionColor(d.versions.findIndex((v) => v.version === r.version))}">${esc(r.version)}</div>
<div style="color:${regionColor(r.region)}">${esc(r.region ?? "—")} · ${esc(r.country ?? "—")}</div>
<div style="color:${r.activated ? GREEN : RED}">${r.activated ? esc(r.activated) : "never"}</div>
<div style="color:${linkColor(r.link)}">${esc(r.link ?? "—")}</div></div>`
  )
  .join("\n")}
</div>
${note("Region is the WoW region of the last listing, not where anyone lives.")}
</div>

<div style="${PANEL};padding:18px 20px;display:flex;flex-direction:column;gap:12px">
${label("Regions")}
<div style="display:flex;flex-direction:column;gap:9px">
${d.regions
  .map((r) => barRow(r.region, r.region === "null" ? "#3d4f6e" : regionColor(r.region), pctOf(r.count, maxRegion), String(r.count), "44px 1fr 24px"))
  .join("\n")}
</div>
<div style="display:flex;flex-direction:column;gap:7px;border-top:1px solid ${BORDER};padding-top:12px">
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM}">Countries · edge-derived</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">
${d.countries
  .map(
    (c) =>
      `<div style="font-family:var(--mono);font-size:11.5px;color:${MUTED};background:rgba(37,51,84,.6);border:1px solid ${BORDER};border-radius:4px;padding:3px 7px">${esc(
        c.country
      )}${c.count > 1 ? ` ${c.count}` : ""}</div>`
  )
  .join("\n")}
</div>
<div style="font-size:11.5px;line-height:1.5;color:${DIM}">${d.countries.length} countr${d.countries.length === 1 ? "y" : "ies"} across ${d.funnel.installs} installs.</div>
</div>
</div>
</div>

</div>
<script>
const growth = ${JSON.stringify(d.growth)};
const runtime = ${JSON.stringify(d.runtime)};
Chart.defaults.font.family = "Inter, system-ui, sans-serif";
Chart.defaults.color = "${DIM}";
Chart.defaults.borderColor = "rgba(61,79,110,.35)";
const axis = { grid: { color: "rgba(61,79,110,.3)" }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkipPadding: 20 } };
new Chart(document.getElementById("growth"), {
  type: "line",
  data: { labels: growth.map(p => p.label), datasets: [{ data: growth.map(p => p.value), borderColor: "${ACCENT}", backgroundColor: "rgba(139,127,212,.12)", borderWidth: 2, fill: true, stepped: true, pointRadius: 0, pointHoverRadius: 4 }] },
  options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: axis, y: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, precision: 0 } } } },
});
new Chart(document.getElementById("runtime"), {
  type: "bar",
  data: { labels: runtime.map(p => p.label), datasets: [{ data: runtime.map(p => p.value), backgroundColor: "rgba(139,127,212,.55)", hoverBackgroundColor: "${ACCENT}", borderRadius: 3 }] },
  options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, precision: 0 } } } },
});
</script>
</body></html>`;
}
