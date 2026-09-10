import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";

const logFile = join(mkdtempSync(join(tmpdir(), "logger-")), "backend.jsonl");

async function freshLogger() {
  vi.resetModules();
  process.env.LOG_FILE = logFile;
  vi.spyOn(console, "log").mockImplementation(() => {});
  return (await import("./logger.js")).createLogger({ service: "RaiderIO" });
}

afterEach(() => vi.restoreAllMocks());

test("appends one JSON line per log, with context and a timestamp", async () => {
  const logger = await freshLogger();
  logger.info("RaiderIO character profile fetched", { durationMs: 1234 });

  const lines = readFileSync(logFile, "utf8").trim().split("\n");
  expect(lines).toHaveLength(1);
  expect(JSON.parse(lines[0])).toMatchObject({
    level: "info",
    message: "RaiderIO character profile fetched",
    service: "RaiderIO",
    durationMs: 1234,
  });
  expect(JSON.parse(lines[0]).time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("rotates once the file passes the size cap", async () => {
  writeFileSync(logFile, "x".repeat(50_000_001));
  const logger = await freshLogger();
  logger.info("first write after the cap is exceeded");

  expect(existsSync(`${logFile}.1`)).toBe(true);
  expect(readFileSync(logFile, "utf8").trim().split("\n")).toHaveLength(1);
});
