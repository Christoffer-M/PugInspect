import { context, SpanKind, trace, TraceFlags } from "@opentelemetry/api";
import { tracing } from "@opentelemetry/sdk-node";
import { expect, test } from "vitest";
import { redactUrl, serverRootsOnly } from "./telemetry.js";

test("redacts the RaiderIO access_key wherever it sits in the query", () => {
  expect(redactUrl("/api/v1/characters/profile?name=x&access_key=abc123&fields=gear")).toBe(
    "/api/v1/characters/profile?name=x&access_key=REDACTED&fields=gear"
  );
  expect(redactUrl("/profile?access_key=abc123")).toBe("/profile?access_key=REDACTED");
  expect(redactUrl("/profile?name=x")).toBe("/profile?name=x");
});

const decide = (kind: SpanKind, ctx = context.active()) =>
  serverRootsOnly.shouldSample(ctx, "0af7651916cd43dd8448eb211c80319c", "span", kind, {}, []).decision;

const withRemoteParent = (flags: TraceFlags) =>
  trace.setSpanContext(context.active(), {
    traceId: "0af7651916cd43dd8448eb211c80319c",
    spanId: "b7ad6b7169203331",
    traceFlags: flags,
    isRemote: true,
  });

test("records traces rooted at an incoming request, drops background work", () => {
  expect(decide(SpanKind.SERVER)).toBe(tracing.SamplingDecision.RECORD_AND_SAMPLED);
  // The crawl's fetches and boot-time queries start with no parent.
  expect(decide(SpanKind.CLIENT)).toBe(tracing.SamplingDecision.NOT_RECORD);
  expect(decide(SpanKind.INTERNAL)).toBe(tracing.SamplingDecision.NOT_RECORD);
});

test("ignores a caller-supplied traceparent's sampled flag", () => {
  expect(decide(SpanKind.SERVER, withRemoteParent(TraceFlags.NONE))).toBe(
    tracing.SamplingDecision.RECORD_AND_SAMPLED
  );
  expect(decide(SpanKind.INTERNAL, withRemoteParent(TraceFlags.SAMPLED))).toBe(
    tracing.SamplingDecision.NOT_RECORD
  );
});
