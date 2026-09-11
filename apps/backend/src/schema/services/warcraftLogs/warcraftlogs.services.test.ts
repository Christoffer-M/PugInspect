import { describe, it, expect, vi, beforeEach } from "vitest";
import { WarcraftLogsService } from "./warcraftlogs.services.js";
import { WclGraphQLClient } from "./wclGraphQLClient.js";
import { getCachedWclProfile } from "../../../db/persistence.js";

vi.mock("./wclGraphQLClient.js", () => ({
  isRateLimitError: () => false,
  WclGraphQLClient: vi.fn(() => ({
    isCircuitOpen: vi.fn(() => false),
    circuitRetryAfterMs: vi.fn(() => 60_000),
    query: vi.fn(),
  })),
}));
vi.mock("../../../db/persistence.js", () => ({
  getCachedWclProfile: vi.fn(),
  persistWclProfile: vi.fn().mockResolvedValue(undefined),
}));

// The service holds one static client instance, built at class-init from the
// mocked constructor — grab that same object so stubs actually take effect.
const client = vi.mocked(WclGraphQLClient).mock.results[0]!.value as {
  isCircuitOpen: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
};

// Distinct names per test: the service dedupes in-flight fetches by cache key.
let n = 0;
const args = () => ({ name: `pugsley${n++}`, realm: "kazzak", region: "eu" });

const STALE = { data: { character: { id: 1 } }, fetchedAt: 1_700_000_000 };

/** Fresh lookup misses; only the allowStale read (the fallback) finds anything. */
const onlyStaleCached = () =>
  vi.mocked(getCachedWclProfile).mockImplementation(async (_key, _params, allowStale) =>
    allowStale ? (STALE as never) : null
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedWclProfile).mockResolvedValue(null);
  client.isCircuitOpen.mockReturnValue(false);
  client.query.mockRejectedValue(new Error("upstream exploded"));
});

describe("WarcraftLogsService.getCharacterProfile", () => {
  // The circuit stays open for minutes and applies to every character page at
  // once — the one failure where the fallback saves the whole site, not one
  // unlucky request.
  it("serves the stale snapshot while the circuit is open", async () => {
    onlyStaleCached();
    client.isCircuitOpen.mockReturnValue(true);

    await expect(WarcraftLogsService.getCharacterProfile(args())).resolves.toEqual(STALE);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("still rate-limits when the circuit is open and nothing is cached", async () => {
    client.isCircuitOpen.mockReturnValue(true);

    await expect(WarcraftLogsService.getCharacterProfile(args())).rejects.toThrow(
      "temporarily rate-limited"
    );
  });

  it("serves the stale snapshot when the fetch fails", async () => {
    onlyStaleCached();

    await expect(WarcraftLogsService.getCharacterProfile(args())).resolves.toEqual(STALE);
  });

  it("still throws when the fetch fails and nothing is cached", async () => {
    await expect(WarcraftLogsService.getCharacterProfile(args())).rejects.toThrow(
      "Failed to fetch character profile from Warcraft Logs"
    );
  });
});
