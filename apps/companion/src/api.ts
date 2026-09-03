// Copy of apps/frontend/src/api/graphqlClient.ts, plus the roster query.
// Copied, not shared: sharing would drag the frontend's codegen output along.
import { graphql } from "./graphql";
import type { Difficulty, RosterCharactersRaidQuery } from "./graphql/graphql";

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "https://puginspect.com/graphql";

// Two documents, not one with both log fields: raidLogs and mythicPlusLogs are
// backed by the same zone-scoped WarcraftLogs profile, so asking for both makes
// the backend pick a single metric that suits only one of them (raid parses
// would come back ranked by the M+ points metric). Each listing type asks for
// exactly the parses it will display.
const RAID = graphql(`
  query RosterCharactersRaid($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {
    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {
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
        raidLogs { bestPerformanceAverage }
      }
    }
  }
`);

const KEYS = graphql(`
  query RosterCharactersKeys($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {
    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {
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
        mythicPlusLogs { bestPerformanceAverage }
      }
    }
  }
`);

type RaidRow = RosterCharactersRaidQuery["rosterCharacters"][number];
type RaidCharacter = NonNullable<RaidRow["character"]>;

/** A looked-up applicant. `logs` is the best-performance average for whichever
 *  parses the listing called for, so the UI needs no raid/keys branch. */
export type RosterEntry = Omit<RaidRow, "character"> & {
  character: (Omit<RaidCharacter, "raidLogs"> & { logs: number | null }) | null;
};

/** Backend caps a request at 10 characters (ROSTER_CHUNK_LIMIT). */
export const CHUNK_SIZE = 10;

/** Raid listings pass a difficulty; M+ listings pass the season's WCL zone. */
export async function lookupCharacters(
  region: string,
  characters: { name: string; realm: string }[],
  scope: { difficulty?: Difficulty } | { zoneId?: number }
): Promise<RosterEntry[]> {
  const keys = "zoneId" in scope;
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Lets the backend attribute API spend to the companion in its logs.
      "X-PugInspect-Client": "companion",
    },
    body: JSON.stringify({ query: keys ? KEYS : RAID, variables: { region, characters, ...scope } }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result: {
    data?: { rosterCharacters: (Omit<RaidRow, "character"> & { character: Record<string, unknown> | null })[] };
    errors?: { message: string }[];
  } = await response.json();
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "GraphQL error");
  return (result.data?.rosterCharacters ?? []).map((e) => {
    const { raidLogs, mythicPlusLogs, ...rest } = (e.character ?? {}) as Record<
      string,
      { bestPerformanceAverage?: number | null } | undefined
    >;
    return {
      ...e,
      character: e.character
        ? ({
            ...rest,
            logs: (keys ? mythicPlusLogs : raidLogs)?.bestPerformanceAverage ?? null,
          } as RosterEntry["character"])
        : null,
    };
  });
}
