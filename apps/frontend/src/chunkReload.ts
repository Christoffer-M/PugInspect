// A deploy replaces the hashed asset files, so a tab that was loaded before it
// asks for route chunks that no longer exist. Vite dispatches vite:preloadError
// on window before rethrowing, and the fix is simply to load the page again —
// the new index.html points at chunks that do exist.
//
// Only covers dynamic imports (the code-split routes). The entry bundle is a
// plain <script type="module">, so if that 404s the browser never gets far
// enough to run this and the page is blank; nothing in the app can catch that.

const KEY = "chunk-reload-at";
const COOLDOWN_MS = 10_000;

/**
 * Whether a preload failure should trigger a reload, given the last attempt
 * recorded in session storage. The cooldown stops a chunk that is genuinely
 * gone for good from reloading the page in a loop — after one try the error
 * surfaces normally.
 */
export function shouldReload(now: number, lastAttempt: string | null): boolean {
  const last = Number(lastAttempt);
  // Junk and future timestamps both fall through to true: a corrupted or
  // clock-skewed entry must not wedge the guard shut for the whole session.
  return !(last <= now && now - last < COOLDOWN_MS);
}

export function registerChunkReload(): void {
  window.addEventListener("vite:preloadError", () => {
    if (!shouldReload(Date.now(), sessionStorage.getItem(KEY))) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    // Deliberately no preventDefault(). Cancelling the event stops Vite's
    // rethrow, which leaves the dynamic import resolving to undefined and the
    // router failing on that instead — a TypeError naming nothing useful. Let
    // the real "Failed to fetch dynamically imported module" through; the
    // reload discards it anyway, and it is the one worth seeing in a log.
    window.location.reload();
  });
}
