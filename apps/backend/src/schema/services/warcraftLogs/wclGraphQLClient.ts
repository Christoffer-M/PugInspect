import { GraphQLError } from "graphql";
import { CircuitBreaker } from "../../utils/circuitBreaker.js";
import { OAuthTokenManager } from "../../utils/oauthTokenManager.js";
import { createLogger } from "../../utils/logger.js";

const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";
const logger = createLogger({ service: "WarcraftLogs" });

export class WclGraphQLClient {
  private readonly circuit = new CircuitBreaker();

  constructor(private readonly tokens: OAuthTokenManager) {}

  isCircuitOpen(): boolean {
    return this.circuit.isOpen();
  }

  circuitRetryAfterMs(): number {
    return this.circuit.retryAfterMs();
  }

  async query<T>(query: string, variables: object): Promise<{ data: T; headers: Headers }> {
    if (this.circuit.isOpen()) {
      const retryAfterMs = this.circuit.retryAfterMs();
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
      this.circuit.open();
      const retryAfterMs = this.circuit.retryAfterMs();
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
