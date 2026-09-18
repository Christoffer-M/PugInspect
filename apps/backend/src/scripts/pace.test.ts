import { describe, expect, it } from "vitest";
import { Pacer } from "./pace.js";

describe("Pacer", () => {
  it("turns a request budget into a per-item interval", () => {
    // 10k requests/hour at 3 requests per character: one character every 1.08s
    expect(Pacer.intervalFor(10_000, 3)).toBe(1080);
    expect(() => Pacer.intervalFor(0, 3)).toThrow();
  });

  it("schedules against the start time, so slow items don't slow the average and fast ones don't burst", () => {
    let now = 1_000;
    const pacer = new Pacer(1080, () => now);
    expect(pacer.delayBefore(0)).toBe(0);

    now += 200; // item 0 finished fast
    expect(pacer.delayBefore(1)).toBe(880);

    now = 1_000 + 5_000; // a slow stretch: we're behind schedule
    expect(pacer.delayBefore(2)).toBe(0);
    expect(pacer.delayBefore(10)).toBe(1_000 + 10 * 1080 - now);
  });

  it("estimates the time left at the scheduled rate", () => {
    expect(new Pacer(1080).etaMs(3333)).toBe(3333 * 1080);
  });
});
