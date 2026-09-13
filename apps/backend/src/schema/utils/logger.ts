import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";

type LogData = Record<string, unknown>;

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const SEVERITY: Record<Level, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

// Per-request chatter logs at debug and is suppressed by default. Set
// LOG_LEVEL=debug to get it back without a code change.
const threshold: number =
  LEVELS[(process.env.LOG_LEVEL ?? "") as Level] ?? LEVELS.info;

// A no-op until telemetry.ts registers the SDK, so scripts and tests that run
// without it just get the console line. Records pick up the active trace
// context on their own, which is what ties a log to its request in Honeycomb.
const otel = logs.getLogger("puginspect-backend");

/** Logs share the traces' dataset, where `name` and `error` are already span
 *  columns (span name, error boolean). Prefixed like the app's span attributes
 *  so a character name or error string never lands in either. */
function toLogAttributes(data: LogData): AnyValueMap {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [`app.${k}`, v])) as AnyValueMap;
}

function log(level: Level, message: string, data: LogData) {
  if (LEVELS[level] < threshold) return;
  otel.emit({
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes: toLogAttributes(data),
  });
  // Still printed: Dozzle and local dev read stdout, and it is the only record
  // of anything that fails before the exporter does.
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
