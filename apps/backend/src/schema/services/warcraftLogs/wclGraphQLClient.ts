import { GraphQLError } from "graphql";
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

  circuitRetryAfterMs(): number {
    return Math.max(0, this.circuitOpenUntil - Date.now());
  }

  async query<T>(query: string, variables: object): Promise<{ data: T; headers: Headers }> {
    if (this.isCircuitOpen()) {
      const retryAfterMs = this.circuitRetryAfterMs();
      logger.warn("WCL_CIRCUIT_OPEN", { retryAfterMs });
      throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
        extensions: { code: "RATE_LIMITED", retryAfterMs },
      });
    }

    const token = await this.tokens.getToken();
    const body = JSON.stringify({ query, variables });
    const start = Date.now();

    const res = await fetch(WCL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
    });

    if (res.status === 429) {
      const durationMs = Date.now() - start;
      this.circuitOpenUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      const retryAfterMs = this.circuitRetryAfterMs();
      logger.warn("WCL_CIRCUIT_OPENED", { durationMs, retryAfterMs });
      throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
        extensions: { code: "RATE_LIMITED", retryAfterMs },
      });
    }

    if (!res.ok) {
      throw new Error(`WCL request failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      const messages = json.errors.map((e) => e.message).join("; ");
      // WCL also reports quota exhaustion inside a 200 response's errors
      // array; treat it like a 429 so callers back off instead of retrying.
      if (/rate limit/i.test(messages)) {
        this.circuitOpenUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
        const retryAfterMs = this.circuitRetryAfterMs();
        logger.warn("WCL_CIRCUIT_OPENED", { retryAfterMs, messages });
        throw new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
          extensions: { code: "RATE_LIMITED", retryAfterMs },
        });
      }
      // GraphQL permits errors alongside usable partial data (e.g. one
      // restricted sub-field on an otherwise-valid character profile) — only a
      // data-less error response is fatal. Left unchecked those surfaced as
      // `data: undefined`, which a long crawl read as "no more rows".
      if (json.data == null) {
        throw new Error(`WCL GraphQL error: ${messages}`);
      }
      logger.warn("WCL partial response", { messages });
    }
    return { data: json.data, headers: res.headers };
  }
}
