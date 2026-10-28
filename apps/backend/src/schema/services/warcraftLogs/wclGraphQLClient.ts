import { trace } from "@opentelemetry/api";
import { GraphQLError, print, type DocumentNode } from "graphql";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { createLogger } from "../../utils/logger.js";

const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";

/** True for the RATE_LIMITED GraphQLError this client throws on 429s and in-band quota errors. */
export const isRateLimitError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "extensions" in error &&
  (error as { extensions?: { code?: string } }).extensions?.code === "RATE_LIMITED";
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;
const logger = createLogger({ service: "WarcraftLogs" });

export class WclGraphQLClient {
  // Circuit breaker: after a 429, skip WCL calls until this timestamp
  private circuitOpenUntil = 0;

  constructor(private readonly tokens: OAuthTokenManager) {}

  isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private rateLimited(): GraphQLError {
    return new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
      extensions: { code: "RATE_LIMITED", retryAfterMs: Math.max(0, this.circuitOpenUntil - Date.now()) },
    });
  }

  private tripCircuit(context: Record<string, unknown> = {}): GraphQLError {
    this.circuitOpenUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    logger.warn("WCL_CIRCUIT_OPENED", { retryAfterMs: RATE_LIMIT_BACKOFF_MS, ...context });
    return this.rateLimited();
  }

  async query<T>(document: DocumentNode, variables: object): Promise<{ data: T }> {
    if (this.isCircuitOpen()) {
      trace.getActiveSpan()?.setAttribute("app.wcl.circuit_open", true);
      throw this.rateLimited();
    }

    const token = await this.tokens.getToken();
    const body = JSON.stringify({ query: print(document), variables });

    // A hung fetch would hang every caller joined on the in-flight dedup map
    // and pin its entry until restart. 15s (not the 10s used for Blizzard/RIO)
    // because this client also serves the spec-meta crawl's heavier rankings queries.
    const res = await fetch(WCL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 429) throw this.tripCircuit();

    if (!res.ok) {
      throw new Error(`WCL request failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      const messages = json.errors.map((e) => e.message).join("; ");
      // WCL also reports quota exhaustion inside a 200 response's errors
      // array; treat it like a 429 so callers back off instead of retrying.
      if (/rate limit/i.test(messages)) throw this.tripCircuit({ messages });
      // GraphQL permits errors alongside usable partial data (e.g. one
      // restricted sub-field on an otherwise-valid character profile) — only a
      // data-less error response is fatal. Left unchecked those surfaced as
      // `data: undefined`, which a long crawl read as "no more rows".
      if (json.data == null) {
        throw new Error(`WCL GraphQL error: ${messages}`);
      }
      logger.warn("WCL partial response", { messages });
    }
    return { data: json.data };
  }
}
