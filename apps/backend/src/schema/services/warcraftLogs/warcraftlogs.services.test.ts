import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import { WarcraftLogsService } from "./warcraftlogs.services.js";
import { WclGraphQLClient } from "./wclGraphQLClient.js";
import { getCachedWclProfile, persistWclProfile } from "../../../db/persistence.js";

vi.mock("./wclGraphQLClient.js", () => ({
  isRateLimitError: (e: unknown) => (e as GraphQLError)?.extensions?.code === "RATE_LIMITED",
  WclGraphQLClient: vi.fn(() => ({
    isCircuitOpen: vi.fn(() => false),
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
  query: ReturnType<typeof vi.fn>;
};

// Distinct names per test: the service dedupes in-flight fetches by cache key.
let n = 0;
const args = () => ({ name: `pugsley${n++}`, realm: "kazzak", region: "eu" });

const STALE = { data: { character: { id: 1 } }, fetchedAt: 1_700_000_000 };

// What the client throws whether the circuit was already open or this very
// request got the 429 that opened it.
const rateLimited = () =>
  new GraphQLError("WarcraftLogs is temporarily rate-limited. Please try again later.", {
    extensions: { code: "RATE_LIMITED", retryAfterMs: 60_000 },
  });

/** Fresh lookup misses; only the allowStale read (the fallback) finds anything. */
const onlyStaleCached = () =>
  vi.mocked(getCachedWclProfile).mockImplementation(async (_key, _params, allowStale) =>
    allowStale ? (STALE as never) : null
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedWclProfile).mockResolvedValue(null);
  client.query.mockRejectedValue(new Error("upstream exploded"));
});

describe("WarcraftLogsService.getCharacterProfile", () => {
  // The circuit stays open for minutes and applies to every character page at
  // once — the one failure where the fallback saves the whole site, not one
  // unlucky request.
  it("serves the stale snapshot when rate-limited", async () => {
    onlyStaleCached();
    client.query.mockRejectedValue(rateLimited());

    await expect(WarcraftLogsService.getCharacterProfile(args())).resolves.toEqual(STALE);
  });

  it("still rate-limits when nothing is cached", async () => {
    client.query.mockRejectedValue(rateLimited());

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

  it("persists a fetched profile under the same params it was looked up by", async () => {
    const characterData = { character: { name: "x", hidden: false, zoneRankings: {} } };
    client.query.mockResolvedValue({ data: { characterData } });

    await WarcraftLogsService.getCharacterProfile({ ...args(), zoneId: 42, difficulty: "Mythic" });

    const lookup = vi.mocked(getCachedWclProfile).mock.calls[0]!;
    const persist = vi.mocked(persistWclProfile).mock.calls[0]!;
    expect(persist[0]).toEqual(lookup[0]);
    expect(persist[1]).toEqual(lookup[1]);
    expect(persist[1]).toMatchObject({ zoneId: 42, difficulty: "Mythic" });
  });
});
