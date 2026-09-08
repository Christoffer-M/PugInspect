// Copy of apps/frontend/src/api/graphqlClient.ts, plus the roster queries.
// Copied, not shared: sharing would drag the frontend's codegen output along.
import { graphql } from "./graphql";
import type {
  Difficulty,
  RosterCharacterInput,
  RosterCharactersCoreQuery,
  RosterCharactersRioQuery,
} from "./graphql/graphql";

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? "https://puginspect.com/graphql";

// One document per upstream, sent as separate requests: the backend fetches only
// what the selection set asks for, so a stalling RaiderIO can no longer hold the
// parses and the identity fields hostage.
const CORE = graphql(`
  query RosterCharactersCore($region: String!, $characters: [RosterCharacterInput!]!) {
    rosterCharacters(region: $region, characters: $characters) {
      name
      realm
      notFound
      role
      character {
        class
        activeSpec
        equippedItemLevel
      }
    }
  }
`);

const RIO = graphql(`
  query RosterCharactersRio($region: String!, $characters: [RosterCharacterInput!]!) {
    rosterCharacters(region: $region, characters: $characters) {
      name
      realm
      notFound
      character {
        raiderIo {
          currentSeason { all { score color } }
          raidProgression { raid total_bosses normal_bosses_killed heroic_bosses_killed mythic_bosses_killed }
        }
      }
    }
  }
`);

// Two log documents, not one with both fields: raidLogs and mythicPlusLogs are
// backed by the same zone-scoped WarcraftLogs profile, so asking for both makes
// the backend pick a single metric that suits only one of them (raid parses
// would come back ranked by the M+ points metric).
const RAID_LOGS = graphql(`
  query RosterCharactersRaidLogs($region: String!, $characters: [RosterCharacterInput!]!, $difficulty: Difficulty) {
    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty) {
      name
      realm
      notFound
      character { raidLogs { bestPerformanceAverage } }
    }
  }
`);

const KEY_LOGS = graphql(`
  query RosterCharactersKeyLogs($region: String!, $characters: [RosterCharacterInput!]!, $zoneId: Int) {
    rosterCharacters(region: $region, characters: $characters, zoneId: $zoneId) {
      name
      realm
      notFound
      character { mythicPlusLogs { bestPerformanceAverage } }
    }
  }
`);

/** The three upstreams, each fetched on its own. */
export const PARTS = ["core", "rio", "logs"] as const;
export type Part = (typeof PARTS)[number];

type CoreRow = RosterCharactersCoreQuery["rosterCharacters"][number];
type RioCharacter = NonNullable<RosterCharactersRioQuery["rosterCharacters"][number]["character"]>;

/** A looked-up applicant, merged from whichever parts have landed. `logs` is the
 *  best-performance average for whichever parses the listing called for, so the
 *  UI needs no raid/keys branch. */
export type RosterEntry = Omit<CoreRow, "character"> & {
  character:
    | (NonNullable<CoreRow["character"]> & Partial<RioCharacter> & { logs?: number | null })
    | null;
};

/** Backend caps a request at 10 characters (ROSTER_CHUNK_LIMIT). */
export const CHUNK_SIZE = 10;

/** Raid listings pass a difficulty; M+ listings pass the season's WCL zone. */
export async function lookupCharacters(
  part: Part,
  region: string,
  characters: RosterCharacterInput[],
  scope: { difficulty?: Difficulty } | { zoneId?: number }
): Promise<RosterEntry[]> {
  const keys = "zoneId" in scope;
  const logs = part === "logs";
  const query = part === "core" ? CORE : part === "rio" ? RIO : keys ? KEY_LOGS : RAID_LOGS;
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Lets the backend attribute API spend to the companion in its logs and
      // block outdated builds via COMPANION_MIN_VERSION.
      "X-PugInspect-Client": `companion/${__APP_VERSION__}`,
    },
    body: JSON.stringify({ query, variables: { region, characters, ...(logs ? scope : {}) } }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result: {
    data?: { rosterCharacters: (Omit<CoreRow, "character"> & { character: Record<string, unknown> | null })[] };
    errors?: { message: string }[];
  } = await response.json();
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "GraphQL error");
  return (result.data?.rosterCharacters ?? []).map((e) => {
    if (!logs) return e as RosterEntry;
    const { raidLogs, mythicPlusLogs } = (e.character ?? {}) as Record<
      string,
      { bestPerformanceAverage?: number | null } | undefined
    >;
    return {
      ...e,
      character: e.character
        ? ({ logs: (keys ? mythicPlusLogs : raidLogs)?.bestPerformanceAverage ?? null } as RosterEntry["character"])
        : null,
    };
  });
}
