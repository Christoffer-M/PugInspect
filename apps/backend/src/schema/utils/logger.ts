type LogData = Record<string, unknown>;

function log(level: "info" | "warn" | "error", message: string, data?: LogData) {
  const entry = { level, message, ...data };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function createLogger(context: LogData) {
  return {
    info: (message: string, data?: LogData) => log("info", message, { ...context, ...data }),
    warn: (message: string, data?: LogData) => log("warn", message, { ...context, ...data }),
    error: (message: string, data?: LogData) => log("error", message, { ...context, ...data }),
  };
}
