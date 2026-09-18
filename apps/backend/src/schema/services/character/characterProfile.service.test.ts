import { describe, it, expect, vi, beforeEach } from "vitest";
import { trace } from "@opentelemetry/api";
import { GraphQLError } from "graphql";
import { getCharacterProfiles } from "./characterProfile.service.js";
import { BlizzardService } from "../blizzard/blizzard.services.js";
import { RaiderIOService } from "../raiderIo/raiderio.services.js";
import { ProgressionService } from "../blizzard/progression.service.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";

vi.mock("../blizzard/blizzard.services.js", () => ({
  BlizzardService: { getCharacterProfile: vi.fn(), getCharacterEquipment: vi.fn() },
}));
vi.mock("../blizzard/progression.service.js", () => ({
  ProgressionService: { getProgression: vi.fn() },
}));
vi.mock("../raiderIo/raiderio.services.js", () => ({
  RaiderIOService: { getCharacterProfile: vi.fn() },
}));
vi.mock("../warcraftLogs/warcraftlogs.services.js", () => ({
  WarcraftLogsService: { getCharacterProfile: vi.fn() },
}));

const UPSTREAM_DELAY_MS = 50;
const after = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), UPSTREAM_DELAY_MS));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(BlizzardService.getCharacterProfile).mockImplementation(() =>
    after({ data: {}, avatarUrl: null, fetchedAt: 0, characterId: "id" } as never)
  );
  vi.mocked(BlizzardService.getCharacterEquipment).mockImplementation(() =>
    after({ data: {}, fetchedAt: 0 } as never)
  );
  vi.mocked(RaiderIOService.getCharacterProfile).mockImplementation(() =>
    after({ data: {}, fetchedAt: 0 } as never)
  );
  vi.mocked(WarcraftLogsService.getCharacterProfile).mockImplementation(() =>
    after({ data: {}, fetchedAt: 0 } as never)
  );
  vi.mocked(ProgressionService.getProgression).mockImplementation(() =>
    after({ data: {}, fetchedAt: 0 } as never)
  );
});

const args = { name: "pugsley", realm: "kazzak", region: "eu" };
const allRequested = {
  raidLogsRequested: true,
  mythicPlusLogsRequested: false,
  progressionRequested: true,
  recentRunsRequested: true,
  blizzardRequested: true,
  gearRequested: true,
  bypassCache: false,
};

describe("getCharacterProfiles", () => {
  // The timing wrapper added for latency logging awaits promises that are
  // already running. If it ever wrapped the *calls* instead, the four upstreams
  // would serialize - reintroducing exactly the stall the roster split removed,
  // silently and with every response still correct.
  it("keeps the upstreams parallel", async () => {
    const start = Date.now();
    await getCharacterProfiles(args, allRequested);
    const elapsed = Date.now() - start;

    // Serialized, five 50ms upstreams would take ~250ms.
    expect(elapsed).toBeLessThan(UPSTREAM_DELAY_MS * 2.5);
  });

  it("returns every upstream's payload", async () => {
    const profiles = await getCharacterProfiles(args, allRequested);

    expect(profiles.blizzardProfile).toBeDefined();
    expect(profiles.rioProfile).toBeDefined();
    expect(profiles.warcraftLogsProfile).toBeDefined();
    expect(profiles.equipment).toBeDefined();
    expect(profiles.progression).toBeDefined();
    expect(profiles.characterId).toBe("id");
  });

  it("survives one upstream failing", async () => {
    vi.mocked(RaiderIOService.getCharacterProfile).mockRejectedValue(new Error("RIO down"));

    const profiles = await getCharacterProfiles(args, allRequested);

    expect(profiles.rioProfile).toBeUndefined();
    expect(profiles.blizzardProfile).toBeDefined();
    expect(profiles.warcraftLogsProfile).toBeDefined();
  });

  // The not-found board in Honeycomb is built on these events.
  it("records a span event per upstream miss", async () => {
    const addEvent = vi.fn();
    vi.spyOn(trace, "getActiveSpan").mockReturnValue({ addEvent } as never);
    vi.mocked(BlizzardService.getCharacterProfile).mockRejectedValue(
      new GraphQLError("Character not found", { extensions: { code: "NOT_FOUND" } })
    );
    vi.mocked(BlizzardService.getCharacterEquipment).mockRejectedValue(new Error("boom"));
    vi.mocked(WarcraftLogsService.getCharacterProfile).mockResolvedValue({ data: null, fetchedAt: 0 } as never);

    await getCharacterProfiles({ ...args, name: "Pugsley" }, allRequested);

    const character = { "app.character.region": "eu", "app.character.realm": "kazzak", "app.character.name": "pugsley" };
    expect(addEvent).toHaveBeenCalledTimes(3);
    expect(addEvent).toHaveBeenCalledWith("character.upstream_miss", {
      "app.upstream": "blizzard",
      "app.error_code": "NOT_FOUND",
      ...character,
    });
    expect(addEvent).toHaveBeenCalledWith("character.upstream_miss", {
      "app.upstream": "blizzard_equipment",
      "app.error_code": "UNEXPECTED",
      ...character,
    });
    expect(addEvent).toHaveBeenCalledWith("character.upstream_miss", {
      "app.upstream": "warcraftlogs",
      "app.error_code": "NOT_FOUND",
      ...character,
    });
    vi.restoreAllMocks();
  });

  it("skips the upstreams the selection set didn't ask for", async () => {
    await getCharacterProfiles(args, {
      ...allRequested,
      progressionRequested: false,
      recentRunsRequested: false,
      raidLogsRequested: false,
      gearRequested: false,
    });

    expect(BlizzardService.getCharacterProfile).toHaveBeenCalled();
    expect(RaiderIOService.getCharacterProfile).not.toHaveBeenCalled();
    expect(ProgressionService.getProgression).not.toHaveBeenCalled();
    expect(WarcraftLogsService.getCharacterProfile).not.toHaveBeenCalled();
    expect(BlizzardService.getCharacterEquipment).not.toHaveBeenCalled();
  });
});
