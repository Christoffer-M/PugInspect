import { describe, it, expect } from "vitest";
import {
  dedupeInFlight,
  sanitizeMetric,
  normalizeRealm,
  normalizeName,
  mapDifficultyIdToName,
  mapEncounter,
  toFixedNumber,
} from "./helpers.js";

describe("sanitizeMetric", () => {
  it("passes valid metrics through", () => {
    expect(sanitizeMetric("dps")).toBe("dps");
    expect(sanitizeMetric("hps")).toBe("hps");
    expect(sanitizeMetric("points_and_damage")).toBe("points_and_damage");
    expect(sanitizeMetric("points_and_healing")).toBe("points_and_healing");
  });

  it("rejects unknown or non-string values", () => {
    expect(sanitizeMetric("playerscore")).toBeNull();
    expect(sanitizeMetric(undefined)).toBeNull();
    expect(sanitizeMetric(42)).toBeNull();
  });
});

describe("normalizeRealm", () => {
  it("lowercases, strips apostrophes, and dashes spaces", () => {
    expect(normalizeRealm("Tarren Mill")).toBe("tarren-mill");
    expect(normalizeRealm("Mal'Ganis")).toBe("malganis");
    expect(normalizeRealm("  Twisting Nether  ")).toBe("twisting-nether");
  });

  it("preserves existing dashes", () => {
    expect(normalizeRealm("tarren-mill")).toBe("tarren-mill");
  });

  it("strips parentheses and keeps diacritics", () => {
    expect(normalizeRealm("Aggra (Português)")).toBe("aggra-português");
    expect(normalizeRealm("aggra-(português)")).toBe("aggra-português");
    expect(normalizeRealm("Pozzo dell'Eternità")).toBe("pozzo-delleternità");
  });
});

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Pugsley ")).toBe("pugsley");
  });
});

describe("mapDifficultyIdToName", () => {
  it("maps known difficulty ids", () => {
    expect(mapDifficultyIdToName(1)).toBe("LFR");
    expect(mapDifficultyIdToName(3)).toBe("Normal");
    expect(mapDifficultyIdToName(4)).toBe("Heroic");
    expect(mapDifficultyIdToName(5)).toBe("Mythic");
  });

  it("returns null for unknown or missing ids", () => {
    expect(mapDifficultyIdToName(2)).toBeNull();
    expect(mapDifficultyIdToName(undefined)).toBeNull();
  });
});

describe("mapEncounter", () => {
  it("maps a complete encounter", () => {
    expect(mapEncounter({ id: 3009, name: "Vexie" })).toEqual({
      id: 3009,
      name: "Vexie",
    });
  });

  it("returns null when id or name is missing", () => {
    expect(mapEncounter(undefined)).toBeNull();
    expect(mapEncounter({ id: 3009 })).toBeNull();
    expect(mapEncounter({ name: "Vexie" })).toBeNull();
  });
});

describe("toFixedNumber", () => {
  it("rounds to two digits by default", () => {
    expect(toFixedNumber(87.6543)).toBe(87.65);
    expect(toFixedNumber(92.346)).toBe(92.35);
    expect(toFixedNumber(100)).toBe(100);
  });

  it("respects a custom digit count", () => {
    expect(toFixedNumber(87.6543, 1)).toBe(87.7);
  });

  it("returns null for non-numbers", () => {
    expect(toFixedNumber(undefined)).toBeNull();
  });
});

describe("dedupeInFlight", () => {
  it("shares one fetch among concurrent callers, then clears the key", async () => {
    const map = new Map<string, Promise<number>>();
    let calls = 0;
    let release!: (n: number) => void;
    const fn = () => {
      calls++;
      return new Promise<number>((r) => (release = r));
    };
    const a = dedupeInFlight(map, "k", fn);
    const b = dedupeInFlight(map, "k", fn);
    release(42);
    expect(await a).toBe(42);
    expect(await b).toBe(42);
    expect(calls).toBe(1);
    // Settled → next call fetches again.
    expect(map.size).toBe(0);
  });

  it("clears the key on rejection so the next call retries", async () => {
    const map = new Map<string, Promise<number>>();
    await expect(dedupeInFlight(map, "k", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(map.size).toBe(0);
  });
});
