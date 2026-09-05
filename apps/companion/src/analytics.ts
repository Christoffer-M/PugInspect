import { loadSettings } from "./settings";
import type { Link } from "./state";

// Companion telemetry goes to PugInspect's own backend, not to Umami. Umami
// identifies a visitor by hashing IP + user-agent under a daily-rotating salt,
// which is right for the website and useless here: two Tauri webviews on
// Windows look identical, and one install's IP changes overnight — so install
// counts, retention and "how often is it used" are unanswerable there. This
// sends a random install id instead, and the backend aggregates.
const ENDPOINT = "https://puginspect.com/api/companion/beat";
const BEAT_MS = 30 * 60 * 1000;
const INSTALL_KEY = "pi-install-id";

/** Random per-install id, minted once and kept in localStorage (which Tauri
 *  persists in the app data dir). Nothing about it is derived from the machine
 *  or the player — it exists only to tell two installs apart. */
function installId(): string {
  let id = localStorage.getItem(INSTALL_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(INSTALL_KEY, id);
  }
  return id;
}

/** What the app is doing right now; App.tsx keeps this current. */
type Snapshot = { link: Link; listing: string; region: string | null; applicants: number; total: number };
let snapshot: Snapshot = { link: "no_window", listing: "", region: null, applicants: 0, total: 0 };
export function reportState(next: Snapshot): void {
  snapshot = next;
}

/** Counted since the last beat, then reset — the beat carries deltas, not totals. */
const counters = { lookups: 0, lookupErrors: 0, notFound: 0 };
export function count(key: keyof typeof counters, n = 1): void {
  counters[key] += n;
}

/** Fire-and-forget, exactly like the Umami sender it replaces: no retry, and a
 *  dropped beat must never surface to the user.
 *
 *  text/plain, not application/json: this is a cross-origin POST from the
 *  webview (tauri.localhost -> puginspect.com) and application/json would
 *  trigger a preflight the endpoint doesn't answer, dropping every beat.
 *  text/plain is CORS-safelisted, so it goes out as a simple request; the
 *  blocked response doesn't matter, nothing reads it. The backend parses with
 *  express.json({ type: "*\/*" }). */
function beat(): void {
  const settings = loadSettings();
  if (!import.meta.env.PROD || !settings.analytics) return;
  const body = {
    installId: installId(),
    version: __APP_VERSION__,
    ...snapshot,
    ...counters,
    settings: settings as unknown as Record<string, boolean | string>,
  };
  counters.lookups = 0;
  counters.lookupErrors = 0;
  counters.notFound = 0;
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** Reports this install as alive on launch, then every half hour it runs. */
export function startHeartbeat(): void {
  beat();
  setInterval(beat, BEAT_MS);
}
