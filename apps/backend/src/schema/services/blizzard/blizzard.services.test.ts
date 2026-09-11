import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlizzardService } from "./blizzard.services.js";
import { getCachedBlizzardProfile, getCachedEquipment } from "../../../db/persistence.js";

vi.mock("../../../db/persistence.js", () => ({
  getCachedBlizzardProfile: vi.fn(),
  persistBlizzardProfile: vi.fn().mockResolvedValue(null),
  getCachedEquipment: vi.fn(),
  persistEquipment: vi.fn().mockResolvedValue(undefined),
}));

// Distinct names per test: the service dedupes in-flight fetches by
// region:realm:name, so a shared name would let one test join another's promise.
let n = 0;
const args = () => ({ name: `pugsley${n++}`, realm: "kazzak", region: "eu" });

const STALE_PROFILE = { data: { name: "cached" }, avatarUrl: null, fetchedAt: 1_700_000_000, characterId: "id" };
const STALE_GEAR = { data: { equipped_items: [] }, fetchedAt: 1_700_000_000 };

/** Fresh lookup misses; only the allowStale read (the fallback) finds anything. */
const onlyStale = <T>(mock: { mockImplementation: (fn: never) => void }, value: T) =>
  mock.mockImplementation((async (_key: unknown, allowStale: boolean) =>
    allowStale ? value : null) as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedBlizzardProfile).mockResolvedValue(null);
  vi.mocked(getCachedEquipment).mockResolvedValue(null);
  // Token fetch and every upstream call go through global fetch; failing it
  // exercises the same path a timeout or a Blizzard outage would.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("The operation was aborted due to timeout")));
});

describe("BlizzardService stale fallback", () => {
  it("serves the stale profile snapshot when the fetch fails", async () => {
    onlyStale(vi.mocked(getCachedBlizzardProfile), STALE_PROFILE);

    await expect(BlizzardService.getCharacterProfile(args())).resolves.toEqual(STALE_PROFILE);
  });

  it("still throws for a profile when nothing is cached", async () => {
    await expect(BlizzardService.getCharacterProfile(args())).rejects.toThrow(
      "Failed to fetch character profile from Blizzard"
    );
  });

  it("serves the stale equipment snapshot when the fetch fails", async () => {
    onlyStale(vi.mocked(getCachedEquipment), STALE_GEAR);

    await expect(BlizzardService.getCharacterEquipment(args())).resolves.toEqual(STALE_GEAR);
  });

  it("still throws for equipment when nothing is cached", async () => {
    await expect(BlizzardService.getCharacterEquipment(args())).rejects.toThrow(
      "Failed to fetch character equipment from Blizzard"
    );
  });

  // An invalid region is our bug or a hand-crafted request, not an outage —
  // it must never be answered from cache, stale or otherwise.
  it("rejects an invalid region before touching the cache", async () => {
    onlyStale(vi.mocked(getCachedBlizzardProfile), STALE_PROFILE);

    await expect(
      BlizzardService.getCharacterProfile({ ...args(), region: "oce" })
    ).rejects.toThrow("Invalid region");
  });
});
