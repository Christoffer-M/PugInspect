import { trace, type Attributes } from "@opentelemetry/api";

const tracer = trace.getTracer("puginspect-backend");

/** Run `fn` inside a child span of whatever is active. Outside a sampled
 *  request (the crawl, bots) the span is non-recording and costs nothing. */
export function withSpan<T>(name: string, attributes: Attributes, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } finally {
      span.end();
    }
  });
}

type CacheSource = "blizzard_profile" | "blizzard_equipment" | "blizzard_progression" | "raiderio" | "wcl";

/** Where one upstream's data came from for the active span: the DB snapshot or
 *  a real upstream call. "missing" is the negative cache — a character Blizzard
 *  404'd recently, answered without spending a request. */
export function markCache(source: CacheSource, outcome: "hit" | "miss" | "missing") {
  trace.getActiveSpan()?.setAttribute(`app.cache.${source}`, outcome);
}

/** An expired snapshot served because the upstream call failed, and how old it
 *  was — during a long outage the age is what says whether the page is lying. */
export function markStale(source: CacheSource, fetchedAt: number) {
  trace.getActiveSpan()?.setAttributes({
    [`app.cache.${source}`]: "stale",
    [`app.cache.${source}_stale_by_s`]: Math.floor(Date.now() / 1000) - fetchedAt,
  });
}
