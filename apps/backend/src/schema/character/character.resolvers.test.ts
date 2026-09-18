import { describe, it, expect, vi, assert, beforeEach } from "vitest";
import { ApolloServer } from "@apollo/server";
import { trace, type Span } from "@opentelemetry/api";
import { characterTypedefs } from "./character.typedefs.js";
import characterResolvers from "./character.resolvers.js";
import { getCharacterProfiles } from "../services/character/characterProfile.service.js";
import { RaiderIOService } from "../services/raiderIo/raiderio.services.js";
import {
  getLinkedCharacters,
  getRosterBySlug,
  insertRoster,
  updateRosterCharacters,
} from "../../db/persistence.js";
import { getSiteStats, recordSearchEvent, type SiteStats } from "../../db/stats.js";
import { searchDirectory } from "../../db/characterDirectory.js";
import { WarcraftLogsService } from "../services/warcraftLogs/warcraftlogs.services.js";
import type { BlizzardCharacterProfile } from "../services/blizzard/model/CharacterProfile.js";
import type { CharacterProgression } from "../services/blizzard/model/Progression.js";

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
  WarcraftLogsService: {
    getZonePartitions: vi.fn(),
    isCircuitOpen: vi.fn(() => false),
    getCharacterProfile: vi.fn().mockResolvedValue({ data: null, fetchedAt: 0 }),
  },
}));
vi.mock("../../db/persistence.js", () => ({
  getLinkedCharacters: vi.fn().mockResolvedValue([]),
  insertRoster: vi.fn(),
  getRosterBySlug: vi.fn(),
  updateRosterCharacters: vi.fn(),
}));
vi.mock("../../db/characterDirectory.js", () => ({
  searchDirectory: vi.fn().mockResolvedValue([]),
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
  realm: { name: "Kazzak", slug: "kazzak" },
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

const progression: CharacterProgression = {
  mythicPlus: {
    currentSeason: { season: "season-mn-2", rating: 2800, color: "#ff8000", bestRuns: [] },
    previousSeason: null,
  },
  raidProgression: [],
};

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
      mythicPlus { currentSeason { rating color } }
      potentialAlts { name realm region }
    }
  }
`;

describe("Query.character", () => {
  it("resolves a character end-to-end through the mappers and field resolvers", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      progression,
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
        mythicPlus: null,
        raidProgression: null,
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
      mythicPlus: { currentSeason: { rating: 2800, color: "#ff8000" } },
      potentialAlts: [{ name: "pugalt", realm: "kazzak", region: "eu" }],
    });
    expect(getLinkedCharacters).toHaveBeenCalledWith("char-uuid-1");
    // Identity lookup (blizzard fields requested) counts as one search
    expect(recordSearchEvent).toHaveBeenCalledTimes(1);
    expect(recordSearchEvent).toHaveBeenCalledWith("char-uuid-1");
  });

  it("normalizes name and region before any lookup or DB write", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: undefined,
      blizzardAvatarUrl: null,
      rioProfile: undefined,
      warcraftLogsProfile: undefined,
      characterId: null,
    });

    const result = await execute(
      `query C($name: String!, $realm: String!, $region: String!) {
        character(name: $name, realm: $realm, region: $region) { name region }
      }`,
      { name: " Стоуфилд ", realm: "гордунни", region: "EU" }
    );

    expect(result.errors).toBeUndefined();
    expect(getCharacterProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ name: "стоуфилд", realm: "gordunni", region: "eu" }),
      expect.anything()
    );
    expect(result.data!.character).toEqual({ name: "стоуфилд", region: "eu" });
  });

  it("returns the resolved realmSlug for a non-canonical realm", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: undefined,
      blizzardAvatarUrl: null,
      rioProfile: undefined,
      warcraftLogsProfile: undefined,
      characterId: null,
    });

    const result = await execute(
      `query C($name: String!, $realm: String!, $region: String!) {
        character(name: $name, realm: $realm, region: $region) { realmSlug }
      }`,
      { name: "bob", realm: "tarrenmill", region: "eu" }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.character).toEqual({ realmSlug: "tarren-mill" });
  });

  it("does not record a search event for follow-up-only queries", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: undefined,
      blizzardAvatarUrl: null,
      progression,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
    });

    const result = await execute(
      `query Character($name: String!, $realm: String!, $region: String!) {
        character(name: $name, realm: $realm, region: $region) {
          mythicPlus { currentSeason { rating } }
        }
      }`,
      { name: "Pugsley", realm: "Kazzak", region: "eu" }
    );

    expect(result.errors).toBeUndefined();
    expect(recordSearchEvent).not.toHaveBeenCalled();
  });

  // The whole point of the Blizzard/Raider.IO split: the page's progression query must
  // not wait on Raider.IO, and the recent-runs query must not refetch Blizzard.
  it("sends only recent runs to Raider.IO and everything else to Blizzard", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: undefined,
      blizzardAvatarUrl: null,
      rioProfile: {
        mythic_plus_recent_runs: [
          { dungeon: "Murder Row", map_challenge_mode_id: 587, mythic_level: 12, completed_at: "", num_keystone_upgrades: 1, url: "u", spec: { name: "Fire" } },
        ],
      },
      warcraftLogsProfile: undefined,
      characterId: null,
    });
    const query = (selection: string) =>
      execute(
        `query C($name: String!, $realm: String!, $region: String!) {
          character(name: $name, realm: $realm, region: $region) { ${selection} }
        }`,
        { name: "Pugsley", realm: "Kazzak", region: "eu" }
      );

    const recent = await query("recentMythicPlusRuns { dungeon keyLevel spec }");
    expect(recent.errors).toBeUndefined();
    expect(recent.data!.character).toEqual({
      recentMythicPlusRuns: [{ dungeon: "Murder Row", keyLevel: 12, spec: "Fire" }],
    });
    expect(vi.mocked(getCharacterProfiles).mock.lastCall![1]).toMatchObject({
      progressionRequested: false,
      recentRunsRequested: true,
    });

    await query("mythicPlus { currentSeason { rating } } raidProgression { raid }");
    expect(vi.mocked(getCharacterProfiles).mock.lastCall![1]).toMatchObject({
      progressionRequested: true,
      recentRunsRequested: false,
    });
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
        realmSlug
        region
      }
    }
  `;

  it("answers from the character directory without calling Raider.IO", async () => {
    vi.mocked(searchDirectory).mockResolvedValueOnce([
      { name: "mørk", realm: "aggra-português" },
      { name: "mørkblad", realm: "tarren-mill" },
    ]);

    const result = await execute(SUGGESTIONS_QUERY, { region: "EU", searchString: " Mørk " });

    expect(result.errors).toBeUndefined();
    expect(searchDirectory).toHaveBeenCalledWith("eu", "mørk", null);
    expect(result.data!.characterSuggestions).toEqual([
      { name: "Mørk", realm: "Aggra (Português)", realmSlug: "aggra-português", region: "EU" },
      { name: "Mørkblad", realm: "Tarren Mill", realmSlug: "tarren-mill", region: "EU" },
    ]);
    expect(RaiderIOService.getCharacterSuggestions).not.toHaveBeenCalled();
  });

  it("narrows to a known realm exactly, or every realm a half-typed one could be", async () => {
    await execute(SUGGESTIONS_QUERY, { region: "eu", searchString: "Pug-TarrenMill" });
    expect(searchDirectory).toHaveBeenLastCalledWith("eu", "pug", ["tarren-mill"]);

    await execute(SUGGESTIONS_QUERY, { region: "eu", searchString: "Pug-Tarr" });
    expect(vi.mocked(searchDirectory).mock.lastCall![2]).toContain("tarren-mill");
  });

  it("falls back to Raider.IO when the directory has nothing", async () => {
    vi.mocked(RaiderIOService.getCharacterSuggestions).mockResolvedValue([
      { name: "pugsley", realm: "Kazzak", realmSlug: "kazzak", region: "EU" },
    ]);

    const result = await execute(SUGGESTIONS_QUERY, { region: "eu", searchString: "pug" });

    expect(result.errors).toBeUndefined();
    expect(result.data!.characterSuggestions).toEqual([
      { name: "pugsley", realm: "Kazzak", realmSlug: "kazzak", region: "EU" },
    ]);
  });

  it("skips the directory for a realm that matches nothing, and survives a DB failure", async () => {
    vi.mocked(RaiderIOService.getCharacterSuggestions).mockResolvedValue([]);

    await execute(SUGGESTIONS_QUERY, { region: "eu", searchString: "pug-zzzqqq" });
    expect(searchDirectory).not.toHaveBeenCalled();
    expect(RaiderIOService.getCharacterSuggestions).toHaveBeenCalledTimes(1);

    vi.mocked(searchDirectory).mockRejectedValueOnce(new Error("connection refused"));
    const result = await execute(SUGGESTIONS_QUERY, { region: "eu", searchString: "pug" });
    expect(result.errors).toBeUndefined();
    expect(RaiderIOService.getCharacterSuggestions).toHaveBeenCalledTimes(2);
  });

  it("records the outcome on the span — the evidence for dropping Raider.IO", async () => {
    const setAttribute = vi.fn();
    const spy = vi.spyOn(trace, "getActiveSpan").mockReturnValue({ setAttribute } as unknown as Span);
    vi.mocked(RaiderIOService.getCharacterSuggestions).mockResolvedValue([
      { name: "pugsley", realm: "Kazzak", realmSlug: "kazzak", region: "KR" },
    ]);

    await execute(SUGGESTIONS_QUERY, { region: "KR", searchString: "pug" });
    spy.mockRestore();

    expect(Object.fromEntries(setAttribute.mock.calls)).toEqual({
      "app.suggest.region": "kr",
      "app.suggest.own_count": 0,
      "app.suggest.fallback_used": true,
      "app.suggest.fallback_count": 1,
    });
  });

  it("rejects search strings shorter than 3 characters", async () => {
    const result = await execute(SUGGESTIONS_QUERY, {
      region: "eu",
      searchString: "pu",
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(RaiderIOService.getCharacterSuggestions).not.toHaveBeenCalled();
    expect(searchDirectory).not.toHaveBeenCalled();
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

describe("Roster Check", () => {
  const ROSTER_CHARACTERS_QUERY = `
    query RosterCharacters($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {
      rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {
        name
        realm
        realmSlug
        notFound
        role
        character {
          name
          class
          activeSpec
          mythicPlus { currentSeason { rating } }
          raidLogs { bestPerformanceAverage }
        }
      }
    }
  `;

  it("maps found and missing characters, deriving role from class + spec", async () => {
    vi.mocked(getCharacterProfiles).mockImplementation(async ({ name }) =>
      name === "pugsley"
        ? {
            blizzardProfile,
            blizzardAvatarUrl: null,
            progression,
            warcraftLogsProfile: undefined,
            characterId: "char-uuid-1",
            equipment: undefined,
          }
        : {
            blizzardProfile: undefined,
            blizzardAvatarUrl: undefined,
            rioProfile: undefined,
            warcraftLogsProfile: undefined,
            characterId: null,
            equipment: undefined,
          }
    );

    const result = await execute(ROSTER_CHARACTERS_QUERY, {
      region: "eu",
      characters: [
        { name: "Pugsley", realm: "Kazzak" },
        // The companion sends the addon's raw form; the slug comes back resolved.
        { name: "Typoed", realm: "TarrenMill" },
      ],
      difficulty: "Heroic",
    });

    expect(result.errors).toBeUndefined();
    const entries = result.data!.rosterCharacters as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      name: "Pugsley",
      realmSlug: "kazzak",
      notFound: false,
      role: "DPS", // Enhancement Shaman
    });
    expect((entries[0]!.character as Record<string, unknown>).class).toBe("Shaman");
    expect(entries[1]).toMatchObject({
      name: "typoed",
      realmSlug: "tarren-mill",
      notFound: true,
      role: null,
      character: null,
    });
    // notFound is expected input - no search events fired for roster views
    expect(recordSearchEvent).not.toHaveBeenCalled();
  });

  it("requests hps parses for healers and default (dps) for everyone else", async () => {
    vi.mocked(getCharacterProfiles).mockImplementation(async ({ name }) => ({
      blizzardProfile: {
        ...blizzardProfile,
        name,
        character_class: { name: name === "treeboi" ? "Druid" : "Shaman" },
        active_spec: { name: name === "treeboi" ? "Restoration" : "Enhancement" },
      } as unknown as BlizzardCharacterProfile,
      blizzardAvatarUrl: null,
      progression,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    }));

    const result = await execute(ROSTER_CHARACTERS_QUERY, {
      region: "eu",
      characters: [
        { name: "Treeboi", realm: "Kazzak" },
        { name: "Pugsley", realm: "Kazzak" },
      ],
      difficulty: "Heroic",
    });

    expect(result.errors).toBeUndefined();
    const wclCalls = vi.mocked(WarcraftLogsService.getCharacterProfile).mock.calls;
    expect(wclCalls.find(([a]) => a.name === "treeboi")?.[0].metric).toBe("hps");
    expect(wclCalls.find(([a]) => a.name === "pugsley")?.[0].metric).toBeUndefined();
  });

  it("prefers the caller's role over the active spec when picking the metric", async () => {
    // A healer Evoker sitting in Devastation: the spec says DPS, the applicant signed up as a healer.
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile: {
        ...blizzardProfile,
        character_class: { name: "Evoker" },
        active_spec: { name: "Devastation" },
      } as unknown as BlizzardCharacterProfile,
      blizzardAvatarUrl: null,
      progression,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    });

    const result = await execute(ROSTER_CHARACTERS_QUERY, {
      region: "eu",
      characters: [{ name: "Scaleheal", realm: "Kazzak", role: "HEALER" }],
      difficulty: "Heroic",
    });

    expect(result.errors).toBeUndefined();
    expect((result.data!.rosterCharacters as Array<Record<string, unknown>>)[0]).toMatchObject({
      role: "HEALER",
    });
    const wclCalls = vi.mocked(WarcraftLogsService.getCharacterProfile).mock.calls;
    expect(wclCalls.find(([a]) => a.name === "scaleheal")?.[0].metric).toBe("hps");
  });

  it("returns a 1:1 response, mapping duplicates to notFound placeholders", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      progression,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    });

    const result = await execute(ROSTER_CHARACTERS_QUERY, {
      region: "eu",
      characters: [
        { name: "Pugsley", realm: "Kazzak" },
        { name: "pugsley", realm: "Kazzak" }, // duplicate after normalization
      ],
      difficulty: "Heroic",
    });

    expect(result.errors).toBeUndefined();
    const entries = result.data!.rosterCharacters as Array<Record<string, unknown>>;
    // The client maps entries to its list by position - dupes must not shrink the array
    expect(entries).toHaveLength(2);
    expect(entries[0]!.notFound).toBe(false);
    expect(entries[1]!.notFound).toBe(true);
    expect(getCharacterProfiles).toHaveBeenCalledTimes(1);
  });

  it("skips progression and WCL entirely for identity-only selections", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      rioProfile: undefined,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    });

    const result = await execute(
      `query Roster($region: String!, $characters: [RosterCharacterInput!]!) {
        rosterCharacters(region: $region, characters: $characters) { name notFound role }
      }`,
      { region: "eu", characters: [{ name: "Pugsley", realm: "Kazzak" }] }
    );

    expect(result.errors).toBeUndefined();
    expect(getCharacterProfiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ progressionRequested: false })
    );
    expect(WarcraftLogsService.getCharacterProfile).not.toHaveBeenCalled();
  });

  // The web roster page and the companion both split their lookup into
  // core/progression/logs documents, because roster.service awaits progression
  // before it starts the WCL call. That only pays off while a parses-only
  // selection leaves progressionRequested false - if it ever flips true, every
  // parse queues behind the progression lookup again.
  it("keeps the parts independent: a parses-only selection never requests progression", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      rioProfile: undefined,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    });

    const result = await execute(
      `query RosterLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {
        rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {
          name
          character { raidLogs { bestPerformanceAverage } }
        }
      }`,
      { region: "eu", characters: [{ name: "Pugsley", realm: "Kazzak" }], difficulty: "Heroic" }
    );

    expect(result.errors).toBeUndefined();
    // Phase 1 fetches identity only - roster.service always passes
    // raidLogsRequested: false there and does WCL itself in phase 2.
    expect(getCharacterProfiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ progressionRequested: false, blizzardRequested: true })
    );
    expect(WarcraftLogsService.getCharacterProfile).toHaveBeenCalled();
  });

  it("keeps the parts independent: a progression-only selection never fetches parses", async () => {
    vi.mocked(getCharacterProfiles).mockResolvedValue({
      blizzardProfile,
      blizzardAvatarUrl: null,
      progression,
      warcraftLogsProfile: undefined,
      characterId: "char-uuid-1",
      equipment: undefined,
    });

    const result = await execute(
      `query RosterProgression($region: String!, $characters: [RosterCharacterInput!]!) {
        rosterCharacters(region: $region, characters: $characters) {
          name
          character { mythicPlus { currentSeason { rating } } }
        }
      }`,
      { region: "eu", characters: [{ name: "Pugsley", realm: "Kazzak" }] }
    );

    expect(result.errors).toBeUndefined();
    expect(getCharacterProfiles).toHaveBeenCalledWith(
      expect.anything(),
      // Rosters never need Raider.IO: progression is all Blizzard.
      expect.objectContaining({ progressionRequested: true, recentRunsRequested: false })
    );
    expect(WarcraftLogsService.getCharacterProfile).not.toHaveBeenCalled();
  });

  it("rejects chunks over the per-request cap", async () => {
    const result = await execute(ROSTER_CHARACTERS_QUERY, {
      region: "eu",
      characters: Array.from({ length: 11 }, (_, i) => ({ name: `char${i}`, realm: "kazzak" })),
      difficulty: null,
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(getCharacterProfiles).not.toHaveBeenCalled();
  });

  const CREATE_ROSTER_MUTATION = `
    mutation CreateRoster($region: String!, $characters: [RosterCharacterInput!]!) {
      createRoster(region: $region, characters: $characters) {
        slug
        region
        characters { name realm }
        editSecret
      }
    }
  `;

  it("creates a roster with normalized, deduped characters and returns the edit secret", async () => {
    vi.mocked(insertRoster).mockResolvedValue({ slug: "abcd1234", editSecret: "s3cret" });

    const result = await execute(CREATE_ROSTER_MUTATION, {
      region: "EU",
      characters: [
        { name: "Pugsley", realm: "Tarren Mill" },
        { name: "pugsley", realm: "Tarren-Mill" }, // duplicate after normalization
      ],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.createRoster).toEqual({
      slug: "abcd1234",
      region: "eu",
      characters: [{ name: "pugsley", realm: "tarren-mill" }],
      editSecret: "s3cret",
    });
  });

  const UPDATE_ROSTER_MUTATION = `
    mutation UpdateRoster($region: String!, $slug: String!, $editSecret: String!, $characters: [RosterCharacterInput!]!) {
      updateRoster(region: $region, slug: $slug, editSecret: $editSecret, characters: $characters) {
        slug
        characters { name realm }
      }
    }
  `;

  it("updates a roster in place with the right secret", async () => {
    vi.mocked(updateRosterCharacters).mockResolvedValue({
      slug: "abcd1234",
      region: "eu",
      characters: [{ name: "pugsley", realm: "kazzak" }],
    });

    const result = await execute(UPDATE_ROSTER_MUTATION, {
      region: "eu",
      slug: "abcd1234",
      editSecret: "s3cret",
      characters: [{ name: "Pugsley", realm: "Kazzak" }],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.updateRoster).toEqual({
      slug: "abcd1234",
      characters: [{ name: "pugsley", realm: "kazzak" }],
    });
    expect(updateRosterCharacters).toHaveBeenCalledWith("eu", "abcd1234", "s3cret", [
      { name: "pugsley", realm: "kazzak" },
    ]);
  });

  it("rejects an update with a wrong secret as FORBIDDEN", async () => {
    vi.mocked(updateRosterCharacters).mockResolvedValue(null);

    const result = await execute(UPDATE_ROSTER_MUTATION, {
      region: "eu",
      slug: "abcd1234",
      editSecret: "wrong",
      characters: [{ name: "Pugsley", realm: "Kazzak" }],
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("never exposes the edit secret through Query.roster", async () => {
    // getRosterBySlug doesn't even select the column; the field resolves null.
    vi.mocked(getRosterBySlug).mockResolvedValue({
      slug: "abcd1234",
      region: "eu",
      characters: [{ name: "pugsley", realm: "kazzak" }],
    });

    const result = await execute(
      `query Roster($region: String!, $slug: String!) {
        roster(region: $region, slug: $slug) { slug editSecret }
      }`,
      { region: "eu", slug: "abcd1234" }
    );

    expect(result.errors).toBeUndefined();
    expect((result.data!.roster as Record<string, unknown>).editSecret).toBeNull();
  });

  it("rejects rosters with no valid characters or an invalid region", async () => {
    const empty = await execute(CREATE_ROSTER_MUTATION, { region: "eu", characters: [{ name: "", realm: "" }] });
    expect(empty.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");

    const badRegion = await execute(CREATE_ROSTER_MUTATION, {
      region: "zz",
      characters: [{ name: "Pugsley", realm: "Kazzak" }],
    });
    expect(badRegion.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(insertRoster).not.toHaveBeenCalled();
  });

  it("reads a roster back by slug", async () => {
    vi.mocked(getRosterBySlug).mockResolvedValue({
      slug: "abcd1234",
      region: "eu",
      characters: [{ name: "pugsley", realm: "kazzak" }],
    });

    const result = await execute(
      `query Roster($region: String!, $slug: String!) {
        roster(region: $region, slug: $slug) { slug region characters { name realm } }
      }`,
      { region: "eu", slug: "abcd1234" }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.roster).toEqual({
      slug: "abcd1234",
      region: "eu",
      characters: [{ name: "pugsley", realm: "kazzak" }],
    });
  });
});
