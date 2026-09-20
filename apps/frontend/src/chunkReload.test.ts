import { describe, it, expect } from "vitest";
import { shouldReload } from "./chunkReload";

const NOW = 1_800_000_000_000;

describe("shouldReload", () => {
  it("reloads when nothing has been recorded yet", () => {
    expect(shouldReload(NOW, null)).toBe(true);
  });

  it("does not reload again inside the cooldown", () => {
    expect(shouldReload(NOW, String(NOW - 1_000))).toBe(false);
  });

  it("reloads again once the cooldown has passed", () => {
    expect(shouldReload(NOW, String(NOW - 10_000))).toBe(true);
    expect(shouldReload(NOW, String(NOW - 60_000))).toBe(true);
  });

  it("reloads rather than wedging on a junk or future timestamp", () => {
    expect(shouldReload(NOW, "not-a-number")).toBe(true);
    expect(shouldReload(NOW, "")).toBe(true);
    expect(shouldReload(NOW, String(NOW + 60_000))).toBe(true);
  });
});
