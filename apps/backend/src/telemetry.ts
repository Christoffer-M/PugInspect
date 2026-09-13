/**
 * OpenTelemetry bootstrap — must run before any app code, so it is loaded with
 * `node --import ./dist/telemetry.js dist/index.js`. Importing it from index.ts
 * would be too late: ESM links the whole import graph before evaluating any of
 * it, so pg and graphql would already be loaded unpatched.
 *
 * Off unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so local dev and CI never need
 * a collector. Everything else uses the standard OTEL_* env vars, e.g. for
 * Honeycomb EU:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=https://api.eu1.honeycomb.io
 *   OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<ingest key>
 */
import { register } from "node:module";
import { SpanKind, type Attributes } from "@opentelemetry/api";
import { NodeSDK, tracing } from "@opentelemetry/sdk-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
import { isbot } from "isbot";

/** RaiderIO takes its API key as a query param; it must never reach a span. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]access_key=)[^&#]*/gi, "$1REDACTED");
}

/**
 * Keep only traces rooted at an incoming HTTP request. Everything that starts
 * without one is dropped along with all of its children: the hourly Mythic+
 * crawl (~640 WCL requests a run), boot migrations, telemetry pruning, and the
 * GraphQL spans of requests the HTTP instrumentation was told to ignore.
 */
const serverKindOnly: tracing.Sampler = {
  shouldSample: (_ctx, _traceId, _name, kind) => ({
    decision:
      kind === SpanKind.SERVER
        ? tracing.SamplingDecision.RECORD_AND_SAMPLED
        : tracing.SamplingDecision.NOT_RECORD,
  }),
  toString: () => "ServerKindOnly",
};

export const serverRootsOnly = new tracing.ParentBasedSampler({
  root: serverKindOnly,
  // This is a public edge: a caller-supplied traceparent must not decide
  // whether we record, in either direction.
  remoteParentSampled: serverKindOnly,
  remoteParentNotSampled: serverKindOnly,
});

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // ESM modules can only be patched through a loader hook. Scoped to what the
  // instrumentations below patch; fetch needs no hook (diagnostics_channel).
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url, {
    data: { include: ["http", "pg", "graphql"] },
  });

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "puginspect-backend",
    sampler: serverRootsOnly,
    // No metrics. Logs are left to the SDK's env default (OTLP, same endpoint
    // and headers as traces) and bypass the sampler above, so the crawl, boot
    // and bot requests still reach Honeycomb as logs even though they have no
    // trace.
    metricReaders: [],
    instrumentations: [
      new HttpInstrumentation({
        // Bots are ~97% of GraphQL traffic and served from the DB cache; the
        // Docker healthcheck is a UA-"node" fetch every 15s. isbot covers both,
        // matching the app's own rule that a missing user-agent is a bot.
        ignoreIncomingRequestHook: (req) => {
          const ua = req.headers["user-agent"];
          return !ua || isbot(ua);
        },
        // client.address is read from X-Forwarded-For, i.e. the visitor's IP.
        // The app never stores visitor IPs (the companion beat keeps country
        // only), so they don't go to a third party either. Undefined drops it.
        startIncomingSpanHook: () => ({ "client.address": undefined }),
      }),
      new UndiciInstrumentation({
        // startSpanHook attributes are merged in before the span is created,
        // so the raw key is never seen by a sampler or processor.
        startSpanHook: (request): Attributes => {
          if (!/[?&]access_key=/i.test(request.path)) return {};
          const url = new URL(redactUrl(request.path), request.origin);
          return { "url.full": url.toString(), "url.query": url.search };
        },
      }),
      new PgInstrumentation(),
      // Apollo marks every resolver non-trivial, so without this each resolved
      // field would be its own span.
      new GraphQLInstrumentation({ ignoreResolveSpans: true }),
    ],
  });

  sdk.start();
  // ponytail: no SIGTERM flush, so a deploy drops the last few seconds of
  // spans and logs (both batch processors export every few seconds). Add
  // sdk.shutdown() on SIGTERM if that gap ever matters.
}
