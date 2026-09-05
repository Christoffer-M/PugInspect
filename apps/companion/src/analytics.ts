import { loadSettings } from "./settings";

// Reuses the site's Umami instance through the backend's first-party /api/send
// proxy (apps/backend/src/index.ts), which injects the real client IP for geo.
// Its own website, so companion beats don't pollute puginspect.com's stats.
const WEBSITE_ID = "780a798a-756e-4da3-ab1b-8e507a663870";
const ENDPOINT = "https://puginspect.com/api/send";
const BEAT_MS = 30 * 60 * 1000;

/** Sends one Umami event. Fire-and-forget: no X-Umami-Cache round-trip, no
 *  retry — a dropped event costs nothing and must never surface to the user.
 *
 *  text/plain, not application/json: this is a cross-origin POST from the
 *  webview (tauri.localhost -> puginspect.com) and /api/send serves no CORS
 *  headers, so application/json would trigger a preflight that fails and drops
 *  every event. text/plain is CORS-safelisted, so the POST goes out as a simple
 *  request; the blocked response doesn't matter, nothing reads it. The backend
 *  parses with express.json({ type: "*\/*" }) and re-sends JSON upstream. */
export function track(name: string, data?: Record<string, string | number>): void {
  if (!import.meta.env.PROD || !loadSettings().analytics) return;
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: WEBSITE_ID,
        hostname: "companion.puginspect.com",
        url: "/",
        name,
        data: { version: __APP_VERSION__, ...data },
      },
    }),
  }).catch(() => {});
}

/** Reports this install as alive, every half hour, for as long as the app runs. */
export function startHeartbeat(): void {
  track("heartbeat");
  setInterval(() => track("heartbeat"), BEAT_MS);
}
