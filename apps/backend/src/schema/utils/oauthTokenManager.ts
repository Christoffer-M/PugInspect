export type TokenFetcher = (key: string) => Promise<{ access_token: string; expires_in: number }>;

/**
 * Generic OAuth2 client-credentials token manager.
 *
 * Handles per-key caching (useful when the same credentials produce different
 * tokens for different regions/tenants) and in-flight request deduplication so
 * concurrent callers share a single token fetch rather than hammering the
 * token endpoint simultaneously.
 *
 * Pass a `fetchToken` callback that performs the actual HTTP POST; the manager
 * takes care of caching and deduplication.
 *
 * For services that need only one global token, call `getToken()` with no
 * argument (defaults to the key `"default"`).
 */
export class OAuthTokenManager {
  private readonly cache = new Map<string, { token: string; expiry: number }>();
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(private readonly fetchToken: TokenFetcher) {}

  async getToken(key = "default"): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) return cached.token;

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = this.acquire(key, now).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private async acquire(key: string, now: number): Promise<string> {
    const { access_token, expires_in } = await this.fetchToken(key);
    this.cache.set(key, { token: access_token, expiry: now + expires_in - 60 });
    return access_token;
  }
}
