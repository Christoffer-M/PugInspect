// Copy of apps/frontend/src/api/graphqlClient.ts + the RosterCharacters query.
// Copied, not shared: sharing would drag the frontend's codegen output along.
import { fetch as nativeFetch } from "@tauri-apps/plugin-http";

// Native (Rust) fetch: a desktop app is not a browser origin, so the backend's
// CORS allow-list does not apply. The browser dev mock keeps window.fetch.
const doFetch = "__PI_MOCK__" in window ? window.fetch : nativeFetch;

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
  } | null;
};

const ROSTER_CHARACTERS = /* GraphQL */ `
  query RosterCharacters($region: String!, $characters: [RosterCharacterInput!]!) {
    rosterCharacters(region: $region, characters: $characters) {
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
      }
    }
  }
`;

/** Backend caps a request at 10 characters (ROSTER_CHUNK_LIMIT). */
export const CHUNK_SIZE = 10;

export async function lookupCharacters(
  region: string,
  characters: { name: string; realm: string }[]
): Promise<RosterEntry[]> {
  const response = await doFetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ROSTER_CHARACTERS, variables: { region, characters } }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result: { data?: { rosterCharacters: RosterEntry[] }; errors?: { message: string }[] } =
    await response.json();
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "GraphQL error");
  return result.data?.rosterCharacters ?? [];
}
