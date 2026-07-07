import { describe, it, expect, vi, assert, beforeEach } from "vitest";
import { ApolloServer } from "@apollo/server";
import { characterTypedefs } from "./character.typedefs.js";
import characterResolvers from "./character.resolvers.js";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import { getLinkedCharacters } from "../../db/persistence.js";
import { getSiteStats, recordSearchEvent, type SiteStats } from "../../db/stats.js";
import type { BlizzardCharacterProfile } from "../services/blizzard/model/CharacterProfile.js";
import type { RaiderIoCharacterApiResponse } from "../services/raiderIo/model/CharacterApiResponse.js";

vi.mock("../services/character/characterProfile.service.js", () => ({
  getCharacterProfiles: vi.fn(),
}));
vi.mock("../services/blizzard/achievements.service.js", () => ({
  AchievementsService: { enrichAndLinkAlts: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../services/raiderIo/raiderio.services.js", () => ({
  RaiderIOService: { getCharacterSuggestions: vi.fn() },
}));
vi.mock("../services/warcraftLogs/warcraftlogs.services.js", () => ({
  WarcraftLogsService: { getZonePartitions: vi.fn() },
}));
vi.mock("../../db/persistence.js", () => ({
  getLinkedCharacters: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../db/stats.js", () => ({
  getSiteStats: vi.fn(),
  recordSearchEvent: vi.fn().mockResolvedValue(undefined),
}));

// Clear call history between tests (implementations set above are kept)
beforeEach(() => {
  vi.clearAllMocks();
});

// Runs real queries against the real schema + resolvers in-process;
// only the service layer (external APIs, DB) is mocked.
const server = new ApolloServer({
  typeDefs: characterTypedefs,
  resolvers: characterResolvers,
});

async function execute(query: string, variables: Record<string, unknown>) {
  const response = await server.executeOperation({ query, variables });
  assert(response.body.kind === "single");
  return response.body.singleResult;
}

// Partial profiles — only the fields the mappers actually read.
const blizzardProfile = {
  name: "Pugsley",
  realm: { name: "Kazzak" },
  gender: { name: "Male" },
  faction: { name: "Horde" },
  race: { name: "Orc" },
  character_class: { name: "Shaman" },
  active_spec: { name: "Enhancement" },
  guild: { name: "Pug Life", realm: { name: "Kazzak" } },
  level: 80,
  achievement_points: 12345,
  average_item_level: 680,
  equipped_item_level: 678,
} as unknown as BlizzardCharacterProfile;

const rioProfile = {
  mythic_plus_scores_by_season: [
    {
      season: "season-tww-2",
      segments: { all: { score: 2800, color: "#ff8000" } },
    },
  ],
} as unknown as RaiderIoCharacterApiResponse;

const CHARACTER_QUERY = `
  query Character($name: String!, $realm: String!, $region: String!) {
    character(name: $name, realm: $realm, region: $region) {
      name
      realm
      region
      class
      activeSpec
      equippedItemLevel
      guild { name realm }
      raiderIo { currentSeason { all { score color } } }
      potentialAlts { name realm region }
    }
  }
`;

describe("Query.character", () => {
  it("resolves a character end-to-end through the mappers and field resolvers", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      rioProfile,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
    });
    vi.mocked(getLinkedCharacters).mockResolvedValue([
      {
        name: "pugalt",
        realm: "kazzak",
        region: "eu",
        class: null,
        itemLevel: null,
        avatarUrl: null,
        mythicPlusScore: null,
        mythicPlusColor: null,
        raidProgression: [],
      },
    ]);

    const result = await execute(CHARACTER_QUERY, {
      name: "Pugsley",
      realm: "Kazzak",
      region: "eu",
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.character).toEqual({
      name: "Pugsley",
      realm: "Kazzak",
      region: "eu",
      class: "Shaman",
      activeSpec: "Enhancement",
      equippedItemLevel: 678,
      guild: { name: "Pug Life", realm: "Kazzak" },
      raiderIo: {
        currentSeason: { all: { score: 2800, color: "#ff8000" } },
      },
      potentialAlts: [{ name: "pugalt", realm: "kazzak", region: "eu" }],
    });
    expect(getLinkedCharacters).toHaveBeenCalledWith("char-uuid-1");
    // Identity lookup (blizzard fields requested) counts as one search
    expect(recordSearchEvent).toHaveBeenCalledTimes(1);
    expect(recordSearchEvent).toHaveBeenCalledWith("char-uuid-1");
  });

  it("does not record a search event for follow-up-only queries", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: undefined,
      blizzardAvatarUrl: null,
      rioProfile,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
    });

    const result = await execute(
      `query Character($name: String!, $realm: String!, $region: String!) {
        character(name: $name, realm: $realm, region: $region) {
          raiderIo { currentSeason { all { score } } }
        }
      }`,
      { name: "Pugsley", realm: "Kazzak", region: "eu" }
    );

    expect(result.errors).toBeUndefined();
    expect(recordSearchEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid region with BAD_USER_INPUT", async () => {
    const result = await execute(CHARACTER_QUERY, {
      name: "Pugsley",
      realm: "Kazzak",
      region: "zz",
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(getCharacterProfiles).not.toHaveBeenCalled();
  });
});

describe("Query.characterSuggestions", () => {
  const SUGGESTIONS_QUERY = `
    query Suggestions($region: String!, $searchString: String!) {
      characterSuggestions(region: $region, searchString: $searchString) {
        name
        realm
        region
      }
    }
  `;

  it("returns suggestions from the service", async () => {
    vi.mocked(RaiderIOService.getCharacterSuggestions).mockResolvedValue([
      { name: "pugsley", realm: "kazzak", region: "eu" },
    ]);

    const result = await execute(SUGGESTIONS_QUERY, {
      region: "eu",
      searchString: "pug",
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.characterSuggestions).toEqual([
      { name: "pugsley", realm: "kazzak", region: "eu" },
    ]);
  });

  it("rejects search strings shorter than 3 characters", async () => {
    const result = await execute(SUGGESTIONS_QUERY, {
      region: "eu",
      searchString: "pu",
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(RaiderIOService.getCharacterSuggestions).not.toHaveBeenCalled();
  });
});

describe("Query.siteStats", () => {
  const SITE_STATS_QUERY = `
    query SiteStats {
      siteStats {
        totalCharacters
        newCharactersThisWeek
        realmsTracked
        searchesToday
        searchesYesterday
        searchesPerDay { date count }
        regionBreakdown { region count }
        classDistribution { class count }
        recentSearches { name realm region class specialization searchedAt }
        trendingCharacters { name realm region class searches }
      }
    }
  `;

  const statsFixture: SiteStats = {
    totalCharacters: 184027,
    newCharactersThisWeek: 6912,
    realmsTracked: 541,
    searchesToday: 12483,
    searchesYesterday: 11534,
    searchesPerDay: [{ date: "2026-07-06", count: 340 }],
    regionBreakdown: [{ region: "eu", count: 78400 }],
    classDistribution: [{ class: "Warrior", count: 20611 }],
    recentSearches: [
      {
        name: "pugsley",
        realm: "kazzak",
        region: "eu",
        class: "Shaman",
        specialization: "Enhancement",
        searchedAt: "2026-07-07T10:00:00.000Z",
      },
    ],
    trendingCharacters: [
      { name: "pugsley", realm: "kazzak", region: "eu", class: "Shaman", searches: 2841 },
    ],
  };

  it("resolves every stats field through the schema and caches for 60s", async () => {
    vi.mocked(getSiteStats).mockResolvedValue(statsFixture);

    const first = await execute(SITE_STATS_QUERY, {});
    expect(first.errors).toBeUndefined();
    expect(first.data!.siteStats).toEqual(statsFixture);

    // Second request within the 60s window is served from the resolver cache
    const second = await execute(SITE_STATS_QUERY, {});
    expect(second.errors).toBeUndefined();
    expect(second.data!.siteStats).toEqual(statsFixture);
    expect(getSiteStats).toHaveBeenCalledTimes(1);
  });
});
