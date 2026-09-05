import { lt, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { companionBeats, companionInstalls } from "./schema.js";
import { createLogger } from "../schema/utils/logger.js";

const logger = createLogger({ service: "CompanionTelemetry" });

/** Beats older than this are dropped; companion_installs keeps the long history. */
const RETAIN_DAYS = 90;

const LINKS = ["ok", "no_window", "lost", "incompatible", "addon_outdated", "app_outdated"];
const LISTINGS = ["", "raid:N", "raid:H", "raid:M", "keys"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CompanionBeatInput = {
  installId: string;
  version: string;
  link: string;
  listing: string;
  region: string | null;
  applicants: number;
  total: number;
  lookups: number;
  lookupErrors: number;
  notFound: number;
  settings: Record<string, boolean | string>;
};

/** Counters are per-interval, so anything above this is a client bug or a forgery. */
const MAX_COUNT = 100_000;
const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_COUNT ? v : null;

/** Validates an untrusted beat body. Returns null on anything unexpected —
 *  the endpoint is public and the payload is entirely attacker-controlled, so
 *  every field is checked against a fixed set or a range rather than stored raw. */
export function parseBeat(body: unknown): CompanionBeatInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.installId !== "string" || !UUID.test(b.installId)) return null;
  if (typeof b.version !== "string" || !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(b.version)) return null;
  if (typeof b.link !== "string" || !LINKS.includes(b.link)) return null;
  if (typeof b.listing !== "string" || !LISTINGS.includes(b.listing)) return null;

  const region =
    b.region == null ? null : typeof b.region === "string" && /^[A-Za-z]{2,4}$/.test(b.region) ? b.region.toLowerCase() : null;

  const applicants = int(b.applicants);
  const total = int(b.total);
  const lookups = int(b.lookups);
  const lookupErrors = int(b.lookupErrors);
  const notFound = int(b.notFound);
  if (applicants === null || total === null || lookups === null || lookupErrors === null || notFound === null) return null;

  // Settings is a snapshot of the companion's own toggles: a small flat object.
  // Bounded in both key count and value size so it can't be used as free storage.
  if (typeof b.settings !== "object" || b.settings === null || Array.isArray(b.settings)) return null;
  const entries = Object.entries(b.settings as Record<string, unknown>);
  if (entries.length > 20) return null;
  const settings: Record<string, boolean | string> = {};
  for (const [k, v] of entries) {
    if (k.length > 32) return null;
    if (typeof v === "boolean") settings[k] = v;
    else if (typeof v === "string" && v.length <= 16) settings[k] = v;
    else return null;
  }

  return { installId: b.installId, version: b.version, link: b.link, listing: b.listing, region, applicants, total, lookups, lookupErrors, notFound, settings };
}

/** Fire-and-forget: upsert the install row, append the beat. Telemetry must
 *  never surface to the user, so failures are logged and swallowed.
 *
 *  ponytail: no FK from beats to installs. The two writes are independent on
 *  purpose — a failed upsert should not also throw away the beat. Add the FK if
 *  orphan beats ever actually turn up. */
export async function recordCompanionBeat(beat: CompanionBeatInput, country: string | null): Promise<void> {
  const db = getDb();
  const now = new Date();
  // Activation is the first frame this install ever decoded; once set it sticks.
  const activatedAt = beat.link === "ok" ? now : null;
  try {
    await db
      .insert(companionInstalls)
      .values({
        installId: beat.installId,
        firstSeen: now,
        lastSeen: now,
        version: beat.version,
        region: beat.region,
        country,
        activatedAt,
      })
      .onConflictDoUpdate({
        target: companionInstalls.installId,
        set: {
          lastSeen: now,
          version: beat.version,
          // A beat with nothing listed carries no region; keep the last known one.
          region: sql`coalesce(excluded.region, ${companionInstalls.region})`,
          country: sql`coalesce(excluded.country, ${companionInstalls.country})`,
          activatedAt: sql`coalesce(${companionInstalls.activatedAt}, excluded.activated_at)`,
        },
      });
  } catch (err) {
    logger.error("DB write failed (companion install)", { error: String(err) });
  }
  try {
    await db.insert(companionBeats).values({
      installId: beat.installId,
      at: now,
      version: beat.version,
      link: beat.link,
      listing: beat.listing,
      region: beat.region,
      applicants: beat.applicants,
      total: beat.total,
      lookups: beat.lookups,
      lookupErrors: beat.lookupErrors,
      notFound: beat.notFound,
      settings: beat.settings,
    });
  } catch (err) {
    logger.error("DB write failed (companion beat)", { error: String(err) });
  }
}

/** Drops beats past the retention window. Install rows are kept forever. */
export async function pruneCompanionBeats(): Promise<void> {
  try {
    await getDb()
      .delete(companionBeats)
      .where(lt(companionBeats.at, new Date(Date.now() - RETAIN_DAYS * 86_400_000)));
  } catch (err) {
    logger.error("Prune failed (companion beats)", { error: String(err) });
  }
}
