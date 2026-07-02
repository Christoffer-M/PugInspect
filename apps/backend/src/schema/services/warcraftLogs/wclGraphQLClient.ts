import { GraphQLError } from "graphql";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { createLogger } from "../../utils/logger.js";

const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";
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

    const json = await res.json() as { data: T };
    return { data: json.data, headers: res.headers };
  }
}
