import { describe, it, expect, vi, beforeEach } from "vitest";
import { RaiderIOService } from "./raiderio.services.js";
import { fetcher, FetchError } from "../../utils/fetcher.js";
import { getCachedRioProfile } from "../../../db/persistence.js";

vi.mock("../../utils/fetcher.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/fetcher.js")>()),
  fetcher: vi.fn(),
}));
vi.mock("../../../db/persistence.js", () => ({
  getCachedRioProfile: vi.fn(),
  persistRioProfile: vi.fn().mockResolvedValue(undefined),
}));

// Distinct names per test: the service dedupes in-flight fetches by
// region:realm:name, so a shared name would let one test join another's promise.
let n = 0;
const args = () => ({ name: `pugsley${n++}`, realm: "kazzak", region: "eu" });

const STALE = { data: { name: "cached" }, fetchedAt: 1_700_000_000 };

/** Fresh lookup misses; only the allowStale read (the fallback) finds anything. */
const onlyStaleCached = () =>
  vi.mocked(getCachedRioProfile).mockImplementation(async (_key, allowStale) =>
    allowStale ? (STALE as never) : null
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedRioProfile).mockResolvedValue(null);
});

describe("RaiderIOService.getCharacterProfile", () => {
  it("serves the expired snapshot when the fetch times out", async () => {
    onlyStaleCached();
    vi.mocked(fetcher).mockRejectedValue(new Error("The operation was aborted due to timeout"));

    await expect(RaiderIOService.getCharacterProfile(args())).resolves.toEqual(STALE);
  });

  it("still throws when nothing is cached", async () => {
    vi.mocked(fetcher).mockRejectedValue(new Error("The operation was aborted due to timeout"));

    await expect(RaiderIOService.getCharacterProfile(args())).rejects.toThrow(
      "Failed to fetch character profile from RaiderIO"
    );
  });

  // A character RaiderIO says doesn't exist must stay not-found. Serving a
  // stale snapshot here would resurrect renamed and transferred characters.
  it("does not serve stale data for a character RaiderIO reports missing", async () => {
    onlyStaleCached();
    vi.mocked(fetcher).mockRejectedValue(
      new FetchError("Fetch failed: 400", 400, "Could not find requested character")
    );

    await expect(RaiderIOService.getCharacterProfile(args())).rejects.toThrow(
      "Character not found on RaiderIO"
    );
  });
});
