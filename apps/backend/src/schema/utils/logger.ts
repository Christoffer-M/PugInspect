import { appendFileSync, renameSync, statSync } from "node:fs";

type LogData = Record<string, unknown>;

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

// Per-request chatter (resolver entries, cache hits) logs at debug and is
// suppressed by default so it can't rotate real signals out of the capped
// container logs. Set LOG_LEVEL=debug to get it back without a code change.
const threshold: number =
  LEVELS[(process.env.LOG_LEVEL ?? "") as Level] ?? LEVELS.info;

// Container logs die with the container, so a deploy erases the history Dozzle
// shows. When LOG_FILE points at a mounted path we append the same JSON lines
// there as well, which survives recreation and is queryable with duckdb.
const logFile = process.env.LOG_FILE;
const MAX_BYTES = 50_000_000;
let writes = 0;

function persist(line: string) {
  if (!logFile) return;
  try {
    // ponytail: one generation, checked every 500 writes — ~100MB ceiling on
    // disk and up to 500 lines of overshoot. Host logrotate if you need more.
    if (writes++ % 500 === 0 && statSync(logFile).size > MAX_BYTES) {
      renameSync(logFile, `${logFile}.1`);
    }
  } catch {
    // No file yet (or the rename lost a race) — the append below recreates it.
  }
  try {
    appendFileSync(logFile, `${line}\n`);
  } catch {
    // A full or unwritable volume must not take the process down.
  }
}

function log(level: Level, message: string, data?: LogData) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...data });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
  persist(line);
}

export function createLogger(context: LogData) {
  return {
    debug: (message: string, data?: LogData) => log("debug", message, { ...context, ...data }),
    info: (message: string, data?: LogData) => log("info", message, { ...context, ...data }),
    warn: (message: string, data?: LogData) => log("warn", message, { ...context, ...data }),
    error: (message: string, data?: LogData) => log("error", message, { ...context, ...data }),
  };
}
