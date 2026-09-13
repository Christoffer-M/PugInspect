import { logs as logsApi } from "@opentelemetry/api-logs";
import { logs } from "@opentelemetry/sdk-node";
import { expect, test, vi } from "vitest";

test("exports log records with prefixed attributes and severity", async () => {
  const exporter = new logs.InMemoryLogRecordExporter();
  const provider = new logs.LoggerProvider({ processors: [new logs.SimpleLogRecordProcessor({ exporter })] });
  logsApi.setGlobalLoggerProvider(provider);
  vi.spyOn(console, "warn").mockImplementation(() => {});

  const { createLogger } = await import("./logger.js");
  createLogger({ service: "WarcraftLogs" }).warn("WCL_QUOTA_HIGH", { name: "esq", error: "boom" });

  const [record] = exporter.getFinishedLogRecords();
  expect(record.body).toBe("WCL_QUOTA_HIGH");
  expect(record.severityText).toBe("WARN");
  // Unprefixed, these would collide with the span `name`/`error` columns.
  expect(record.attributes).toEqual({
    "app.service": "WarcraftLogs",
    "app.name": "esq",
    "app.error": "boom",
  });
});
