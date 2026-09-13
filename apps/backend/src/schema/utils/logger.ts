type LogData = Record<string, unknown>;

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

// Per-request chatter (resolver entries, cache hits) logs at debug and is
// suppressed by default so it can't rotate real signals out of the capped
// container logs. Set LOG_LEVEL=debug to get it back without a code change.
const threshold: number =
  LEVELS[(process.env.LOG_LEVEL ?? "") as Level] ?? LEVELS.info;

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
}

export function createLogger(context: LogData) {
  return {
    debug: (message: string, data?: LogData) => log("debug", message, { ...context, ...data }),
    info: (message: string, data?: LogData) => log("info", message, { ...context, ...data }),
    warn: (message: string, data?: LogData) => log("warn", message, { ...context, ...data }),
    error: (message: string, data?: LogData) => log("error", message, { ...context, ...data }),
  };
}
