import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlizzardService } from "./blizzard.services.js";
import { getCachedBlizzardProfile, getCachedEquipment } from "../../../db/persistence.js";
import { clearMissingCharacters } from "../../utils/missingCharacters.js";

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

describe("BlizzardService negative cache", () => {
  const notFound = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) =>
        url.includes("oauth")
          ? new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 })
          : new Response("", { status: 404 })
      )
    );

  beforeEach(() => clearMissingCharacters());

  it("asks Blizzard once for a character that 404s, then answers from memory", async () => {
    notFound();
    const character = args();

    await expect(BlizzardService.getCharacterProfile(character)).rejects.toThrow("Character not found");
    const afterFirst = vi.mocked(fetch).mock.calls.length;

    await expect(BlizzardService.getCharacterProfile(character)).rejects.toThrow("Character not found");
    expect(vi.mocked(fetch).mock.calls.length).toBe(afterFirst);
  });

  it("does not spend equipment calls on a character the profile already 404'd", async () => {
    notFound();
    const character = args();

    await expect(BlizzardService.getCharacterProfile(character)).rejects.toThrow("Character not found");
    const afterProfile = vi.mocked(fetch).mock.calls.length;

    await expect(BlizzardService.getCharacterEquipment(character)).rejects.toThrow("Character not found");
    expect(vi.mocked(fetch).mock.calls.length).toBe(afterProfile);
  });

  it("an explicit refresh still reaches Blizzard", async () => {
    notFound();
    const character = args();

    await expect(BlizzardService.getCharacterProfile(character)).rejects.toThrow("Character not found");
    const afterFirst = vi.mocked(fetch).mock.calls.length;

    await expect(BlizzardService.getCharacterProfile(character, true)).rejects.toThrow("Character not found");
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(afterFirst);
  });
});

describe("BlizzardService item icons", () => {
  // Equipment hrefs pin the static namespace of the build the character was last
  // saved on; Blizzard 404s old builds, so icons must use the unversioned one.
  it("requests item media with the unversioned static namespace", async () => {
    const gear = {
      _links: { self: { href: "" } },
      equipped_items: [{
        item: { key: { href: "" }, id: 990001 },
        media: {
          key: { href: "https://eu.api.blizzard.com/data/wow/media/item/990001?namespace=static-12.0.5_66741-eu" },
          id: 990001,
        },
      }],
    };
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("oauth")) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
      if (url.includes("/equipment")) return new Response(JSON.stringify(gear), { status: 200 });
      return url.includes("namespace=static-eu&")
        ? new Response(JSON.stringify({ assets: [{ key: "icon", value: "https://render/icon.jpg" }] }), { status: 200 })
        : new Response("", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { data } = await BlizzardService.getCharacterEquipment(args());

    const mediaUrl = fetchMock.mock.calls.map(([u]) => u as string).find((u) => u.includes("/media/item/"));
    expect(mediaUrl).toBe("https://eu.api.blizzard.com/data/wow/media/item/990001?namespace=static-eu&locale=en_US");
    expect(data.equipped_items[0]!.iconUrl).toBe("https://render/icon.jpg");
  });
});
