// Copy of apps/frontend/src/api/graphqlClient.ts + the RosterCharacters query.
// Copied, not shared: sharing would drag the frontend's codegen output along.
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "https://puginspect.com/graphql";

export type RosterEntry = {
  name: string;
  realm: string;
  notFound: boolean;
  role: "TANK" | "HEALER" | "DPS" | null;
  character: {
    class: string;
    activeSpec: string | null;
    equippedItemLevel: number | null;
    raiderIo: {
      currentSeason: { all: { score: number; color: string | null } | null } | null;
      raidProgression: {
        raid: string;
        total_bosses: number | null;
        normal_bosses_killed: number | null;
        heroic_bosses_killed: number | null;
        mythic_bosses_killed: number | null;
      }[] | null;
    } | null;
    raidLogs: { bestPerformanceAverage: number | null; medianPerformanceAverage: number | null } | null;
    mythicPlusLogs: { bestPerformanceAverage: number | null } | null;
  } | null;
};

const ROSTER_CHARACTERS = /* GraphQL */ `
  query RosterCharacters($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty, $zoneId: Int) {
    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty, zoneId: $zoneId) {
      name
      realm
      notFound
      role
      character {
        class
        activeSpec
        equippedItemLevel
        raiderIo {
          currentSeason { all { score color } }
          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }
        }
        raidLogs { bestPerformanceAverage medianPerformanceAverage }
        mythicPlusLogs { bestPerformanceAverage }
      }
    }
  }
`;

/** Backend caps a request at 10 characters (ROSTER_CHUNK_LIMIT). */
export const CHUNK_SIZE = 10;

/** Raid listings pass a difficulty; M+ listings pass the season's WCL zone so
 *  the same call yields M+ parses instead of raid parses. */
export async function lookupCharacters(
  region: string,
  characters: { name: string; realm: string }[],
  scope: { difficulty?: "Normal" | "Heroic" | "Mythic"; zoneId?: number }
): Promise<RosterEntry[]> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ROSTER_CHARACTERS, variables: { region, characters, ...scope } }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result: { data?: { rosterCharacters: RosterEntry[] }; errors?: { message: string }[] } =
    await response.json();
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "GraphQL error");
  return result.data?.rosterCharacters ?? [];
}
