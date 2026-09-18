/**
 * Fixed-rate scheduling for one-off upstream jobs: item `n` may start at
 * `startedAt + n * intervalMs`. Scheduling against the start time (rather than
 * sleeping a fixed gap after each item) keeps the average rate exact however
 * long each item takes, without letting a slow stretch be "made up" in a burst
 * beyond the schedule.
 */
export class Pacer {
  private readonly startedAt: number;

  constructor(
    readonly intervalMs: number,
    private readonly now: () => number = Date.now
  ) {
    this.startedAt = now();
  }

  /** Milliseconds between items for a request budget, given each item's request cost. */
  static intervalFor(requestsPerHour: number, requestsPerItem: number): number {
    if (!(requestsPerHour > 0) || !(requestsPerItem > 0)) throw new Error("Rates must be positive");
    return (3_600_000 / requestsPerHour) * requestsPerItem;
  }

  /** How long to wait before starting item `n` (0-based). */
  delayBefore(n: number): number {
    return Math.max(0, this.startedAt + n * this.intervalMs - this.now());
  }

  /** Milliseconds left for `remaining` more items at the scheduled rate. */
  etaMs(remaining: number): number {
    return remaining * this.intervalMs;
  }
}
