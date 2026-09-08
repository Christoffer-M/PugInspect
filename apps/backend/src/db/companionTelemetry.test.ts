import { describe, expect, it } from "vitest";
import { summarizeCompanionTelemetry } from "./companionTelemetry.js";

const NOW = new Date("2026-09-07T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * DAY - hours * 3_600_000);

type Install = Parameters<typeof summarizeCompanionTelemetry>[0][number];
type Beat = Parameters<typeof summarizeCompanionTelemetry>[1][number];

const install = (over: Partial<Install> & Pick<Install, "installId" | "firstSeen" | "lastSeen">): Install => ({
  version: "0.6.0",
  region: "eu",
  country: "SE",
  activatedAt: over.firstSeen,
  ...over,
});

const beat = (over: Partial<Beat> & Pick<Beat, "installId" | "at">): Beat => ({
  version: "0.6.0",
  link: "ok",
  applicants: 4,
  total: 4,
  lookups: 10,
  lookupErrors: 0,
  notFound: 1,
  updateFailures: 0,
  updatePending: null,
  ...over,
});

describe("summarizeCompanionTelemetry", () => {
  it("counts the activation funnel from activated_at, not from beats", () => {
    const d = summarizeCompanionTelemetry(
      [
        install({ installId: "a", firstSeen: ago(20), lastSeen: ago(1) }),
        install({ installId: "b", firstSeen: ago(10), lastSeen: ago(9), activatedAt: null }),
        install({ installId: "c", firstSeen: ago(5), lastSeen: ago(5) }),
      ],
      [beat({ installId: "b", at: ago(9), link: "no_window" })],
      NOW
    );
    expect(d.funnel).toEqual({ installs: 3, activated: 2, activeThisWeek: 2, never: 1, neverNoWindow: 1 });
  });

  it("splits sessions on a gap longer than one beat interval", () => {
    const d = summarizeCompanionTelemetry(
      [install({ installId: "a", firstSeen: ago(2), lastSeen: ago(1) })],
      [
        // One 1h session (3 beats), then hours of silence, then a 30min one.
        beat({ installId: "a", at: ago(2, 3) }),
        beat({ installId: "a", at: new Date(ago(2, 3).getTime() + 30 * 60_000) }),
        beat({ installId: "a", at: new Date(ago(2, 3).getTime() + 60 * 60_000) }),
        beat({ installId: "a", at: ago(1) }),
      ],
      NOW
    );
    // Two sessions: one of three beats ("1.5–2 h"), one of a single beat.
    expect(d.sessions.find((s) => s.bucket === "30 min")!.percent).toBe(50);
    expect(d.sessions.find((s) => s.bucket === "1.5–2 h")!.percent).toBe(50);
  });

  it("measures day-7 retention only for cohorts old enough to have one", () => {
    const d = summarizeCompanionTelemetry(
      [
        // Joined 10 days ago and still beating on day 7 — a completed cohort.
        install({ installId: "old", firstSeen: ago(10), lastSeen: ago(1) }),
        // Joined 2 days ago: day 7 is unknowable, so it lands in the pending bucket.
        install({ installId: "new", firstSeen: ago(2), lastSeen: ago(1) }),
      ],
      [beat({ installId: "old", at: ago(1) }), beat({ installId: "new", at: ago(1) })],
      NOW
    );
    const completed = d.cohorts[2]!;
    expect(completed.size).toBe(1);
    expect(completed.day7).toBe(1);
    const pending = d.cohorts[3]!;
    expect(pending).toMatchObject({ size: 1, day1: 1, pending: true });
    expect(pending.daysToWait).toBe(5);
  });

  it("groups stranded installs by version pair and sums their update failures", () => {
    const d = summarizeCompanionTelemetry(
      [
        install({ installId: "a", firstSeen: ago(20), lastSeen: ago(1), version: "0.5.1" }),
        install({ installId: "b", firstSeen: ago(20), lastSeen: ago(1), version: "0.5.1" }),
        install({ installId: "c", firstSeen: ago(20), lastSeen: ago(1) }),
      ],
      [
        beat({ installId: "a", at: ago(1), version: "0.5.1", updatePending: "0.6.0", updateFailures: 1 }),
        beat({ installId: "b", at: ago(2), version: "0.5.1", updatePending: "0.6.0", updateFailures: 2 }),
        beat({ installId: "c", at: ago(1) }),
      ],
      NOW
    );
    expect(d.stranded.reduce((n, g) => n + g.installs, 0)).toBe(2);
    expect(d.stranded).toEqual([{ from: "0.5.1", to: "0.6.0", installs: 2, failures: 3 }]);
    expect(d.versions).toEqual([
      { version: "0.6.0", count: 1 },
      { version: "0.5.1", count: 2 },
    ]);
  });

  it("reports the cap and lookup counters over the 7-day window only", () => {
    const d = summarizeCompanionTelemetry(
      [install({ installId: "a", firstSeen: ago(20), lastSeen: ago(1) })],
      [
        beat({ installId: "a", at: ago(1), applicants: 20, total: 34, lookups: 100, notFound: 5, lookupErrors: 2 }),
        beat({ installId: "a", at: ago(2), applicants: 3, total: 3, lookups: 100 }),
        // Older than a week: counted in runtime, excluded from these two panels.
        beat({ installId: "a", at: ago(20), applicants: 20, total: 99, lookups: 9_000 }),
      ],
      NOW
    );
    expect(d.beatsThisWeek).toBe(2);
    expect(d.cap).toEqual({ limit: 20, beats: 1, installs: 1, maxTotal: 34 });
    expect(d.lookups).toEqual({ total: 200, notFound: 6, errors: 2 });
  });

  it("survives an empty database", () => {
    const d = summarizeCompanionTelemetry([], [], NOW);
    expect(d.newestReport).toBeNull();
    expect(d.funnel.installs).toBe(0);
    expect(d.cap.beats).toBe(0);
    expect(d.growth).toHaveLength(31);
  });
});
