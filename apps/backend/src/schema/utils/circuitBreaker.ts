export class CircuitBreaker {
  static readonly RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;

  private openUntil: number | null = null;

  isOpen(): boolean {
    return this.openUntil !== null && Date.now() < this.openUntil;
  }

  retryAfterMs(): number {
    return this.openUntil !== null ? Math.max(0, this.openUntil - Date.now()) : 0;
  }

  open(durationMs = CircuitBreaker.RATE_LIMIT_BACKOFF_MS): void {
    this.openUntil = Date.now() + durationMs;
  }
}
