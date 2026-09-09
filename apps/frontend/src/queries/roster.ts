import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CreateRosterMutation,
  CreateRosterMutationVariables,
  Difficulty,
  RosterCoreQuery,
  RosterCoreQueryVariables,
  RosterLogsQuery,
  RosterLogsQueryVariables,
  RosterQuery,
  RosterQueryVariables,
  RosterRioQuery,
  RosterRioQueryVariables,
  UpdateRosterMutation,
  UpdateRosterMutationVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

/** The three upstreams, each fetched on its own. */
export const ROSTER_PARTS = ["core", "rio", "logs"] as const;
export type RosterPart = (typeof ROSTER_PARTS)[number];

type CoreRow = RosterCoreQuery["rosterCharacters"][number];
type RioCharacter = NonNullable<RosterRioQuery["rosterCharacters"][number]["character"]>;
type LogsCharacter = NonNullable<RosterLogsQuery["rosterCharacters"][number]["character"]>;

/** A roster member merged from whichever parts have landed. `pending` lets the
 *  cards tell "this upstream hasn't answered yet" apart from "it answered and
 *  there's nothing there" - without it every card would flash "no kills" while
 *  WarcraftLogs is still in flight. */
export type RosterEntry = Omit<CoreRow, "character"> & {
  character:
    | (NonNullable<CoreRow["character"]> & Partial<RioCharacter> & Partial<LogsCharacter>)
    | null;
  pending: Record<Exclude<RosterPart, "core">, boolean>;
};

export type RosterCharacterKey = { name: string; realm: string };

/** Server-side per-request cap - a 30-man roster becomes 3 chunked requests,
 *  which keeps a paste + two difficulty toggles well under the backend's
 *  100 req/min per-IP limit. */
export const ROSTER_CHUNK_SIZE = 10;

const createRosterMutation = graphql(`
  mutation CreateRoster($region: String!, $characters: [RosterCharacterInput!]!) {
    createRoster(region: $region, characters: $characters) {
      slug
      region
      characters {
        name
        realm
      }
      editSecret
    }
  }
`);

const updateRosterMutation = graphql(`
  mutation UpdateRoster(
    $region: String!
    $slug: String!
    $editSecret: String!
    $characters: [RosterCharacterInput!]!
  ) {
    updateRoster(region: $region, slug: $slug, editSecret: $editSecret, characters: $characters) {
      slug
      region
      characters {
        name
        realm
      }
    }
  }
`);

const rosterQuery = graphql(`
  query Roster($region: String!, $slug: String!) {
    roster(region: $region, slug: $slug) {
      slug
      region
      characters {
        name
        realm
      }
    }
  }
`);

/**
 * Three documents, not one: the backend spends upstream quota per selection
 * set (see `isRosterCharacterFieldRequested` in character.resolvers.ts), and
 * its roster lookup awaits RaiderIO before it starts the WarcraftLogs call.
 * Asking for both in one query therefore puts RIO's latency in front of every
 * parse. Split, each upstream lands on its own - the same shape the companion
 * app uses.
 *
 * Only the logs document takes a difficulty/zone, so toggling difficulty
 * refetches parses alone: identity and RIO progression are difficulty-agnostic
 * (progFor derives every difficulty from the one raidProgression payload).
 */
const rosterCoreQuery = graphql(`
  query RosterCore($region: String!, $characters: [RosterCharacterInput!]!) {
    rosterCharacters(region: $region, characters: $characters) {
      name
      realm
      notFound
      role
      character {
        name
        realm
        region
        class
        activeSpec
        level
        equippedItemLevel
        avatarUrl
        guild {
          name
        }
      }
    }
  }
`);

const rosterRioQuery = graphql(`
  query RosterRio($region: String!, $characters: [RosterCharacterInput!]!) {
    rosterCharacters(region: $region, characters: $characters) {
      name
      realm
      notFound
      character {
        raiderIo {
          currentSeason {
            all {
              score
              color
            }
          }
          raidProgression {
            raid
            total_bosses
            normal_bosses_killed
            heroic_bosses_killed
            mythic_bosses_killed
          }
        }
      }
    }
  }
`);

const rosterLogsQuery = graphql(`
  query RosterLogs(
    $region: String!
    $characters: [RosterCharacterInput!]!
    $difficulty: Difficulty
    $zoneId: Int
  ) {
    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty, zoneId: $zoneId) {
      name
      realm
      notFound
      character {
        raidLogs {
          bestPerformanceAverage
          medianPerformanceAverage
        }
      }
    }
  }
`);

export const useCreateRoster = () =>
  useMutation({
    mutationFn: async (variables: CreateRosterMutationVariables) => {
      const response = await execute<CreateRosterMutation, CreateRosterMutationVariables>(
        createRosterMutation,
        variables
      );
      return response.createRoster;
    },
  });

export const useUpdateRoster = () =>
  useMutation({
    mutationFn: async (variables: UpdateRosterMutationVariables) => {
      const response = await execute<UpdateRosterMutation, UpdateRosterMutationVariables>(
        updateRosterMutation,
        variables
      );
      return response.updateRoster;
    },
  });

/**
 * The roster edit secret, handed out once by createRoster and kept in
 * localStorage - whoever holds it edits the slug in place; rosters are
 * read-only for everyone else. The in-memory map is a fallback for browsers
 * where localStorage is unavailable (private mode / storage blocked), so a
 * creator can at least edit their roster for the lifetime of the tab.
 */
const memorySecrets = new Map<string, string>();

const secretKey = (region: string, slug: string) =>
  `pi-roster-secret:${region.toLowerCase()}/${slug}`;

export function storeRosterSecret(region: string, slug: string, secret: string | null | undefined) {
  if (!secret) return;
  memorySecrets.set(secretKey(region, slug), secret);
  try {
    localStorage.setItem(secretKey(region, slug), secret);
  } catch {
    // Memory fallback above already covers this tab's session.
  }
}

export function readRosterSecret(region: string, slug: string): string | null {
  try {
    return localStorage.getItem(secretKey(region, slug)) ?? memorySecrets.get(secretKey(region, slug)) ?? null;
  } catch {
    return memorySecrets.get(secretKey(region, slug)) ?? null;
  }
}

/** Forget a secret the server has rejected - keeping it leaves the edit UI
 * enabled with every action dead-ending. */
export function clearRosterSecret(region: string, slug: string) {
  memorySecrets.delete(secretKey(region, slug));
  try {
    localStorage.removeItem(secretKey(region, slug));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export const useRoster = (region: string, slug: string) =>
  useQuery({
    queryKey: queryKeys.roster(region, slug),
    queryFn: async () => {
      const response = await execute<RosterQuery, RosterQueryVariables>(rosterQuery, { region, slug });
      return response.roster ?? null;
    },
    // Rosters are immutable - a slug's character list never changes.
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

/** Chunk the roster into request-sized slices, preserving order. */
function chunkCharacters(characters: RosterCharacterKey[]): RosterCharacterKey[][] {
  const chunks: RosterCharacterKey[][] = [];
  for (let i = 0; i < characters.length; i += ROSTER_CHUNK_SIZE) {
    chunks.push(characters.slice(i, i + ROSTER_CHUNK_SIZE));
  }
  return chunks;
}

type PartResult<T> = {
  data: T[] | undefined;
  isError: boolean;
  refetch: () => void;
};

/** A part is pending until it either answers or fails - an errored part must
 *  stop reading as "still loading" or its cells skeleton forever. */
const isPending = (part: PartResult<unknown> | undefined) => !part?.data && !part?.isError;

// Without combine, useQueries returns a fresh array reference every render,
// which defeats every downstream useMemo (entries, sorting, summary stats).
// Defined at module scope: a combine redefined per render misses the observer's
// memo (it compares the function by identity) and recombines every time.
const combineParts = <T,>(results: readonly PartResult<T>[]): PartResult<T>[] =>
  results.map((r) => ({ data: r.data, isError: r.isError, refetch: r.refetch }));

export type RosterChunkResult = {
  /** Defined once the core lookup lands; RIO and parses merge in as they arrive. */
  data: RosterEntry[] | undefined;
  isError: boolean;
  refetch: () => void;
};

/** One query per part per chunk of ≤10 characters, so cards stream in as chunks
 *  land and each upstream lands independently of the others. */
export const useRosterChunks = ({
  region,
  characters,
  difficulty,
  zoneId,
  enabled = true,
}: {
  region: string;
  characters: RosterCharacterKey[];
  difficulty: Difficulty;
  zoneId?: number | null;
  enabled?: boolean;
}): RosterChunkResult[] => {
  const chunks = chunkCharacters(characters);

  // Roster lookups fan out to three upstreams per character - errors render
  // inline per chunk, not as a global red toast per failed chunk.
  const shared = {
    enabled,
    retry: false,
    meta: { suppressErrorToast: true },
    // Mirrors the backend's 900s WCL/RIO snapshot TTL.
    gcTime: 1000 * 60 * 15,
    staleTime: 1000 * 60 * 15,
  } as const;

  const coreResults = useQueries({
    combine: combineParts,
    queries: chunks.map((chunk) => ({
      ...shared,
      queryKey: queryKeys.rosterChunk("core", region, chunk),
      queryFn: async (): Promise<CoreRow[]> => {
        const response = await execute<RosterCoreQuery, RosterCoreQueryVariables>(rosterCoreQuery, {
          region,
          characters: chunk,
        });
        return response.rosterCharacters;
      },
    })),
  });

  const rioResults = useQueries({
    combine: combineParts,
    queries: chunks.map((chunk) => ({
      ...shared,
      queryKey: queryKeys.rosterChunk("rio", region, chunk),
      queryFn: async (): Promise<RosterRioQuery["rosterCharacters"]> => {
        const response = await execute<RosterRioQuery, RosterRioQueryVariables>(rosterRioQuery, {
          region,
          characters: chunk,
        });
        return response.rosterCharacters;
      },
    })),
  });

  const logsResults = useQueries({
    combine: combineParts,
    queries: chunks.map((chunk) => ({
      ...shared,
      queryKey: queryKeys.rosterChunk("logs", region, chunk, difficulty),
      // Keep showing the previous difficulty's parses while the new ones load.
      // Only this part is difficulty-keyed, so it's the only one that can flash.
      placeholderData: (prev: RosterLogsQuery["rosterCharacters"] | undefined) => prev,
      queryFn: async (): Promise<RosterLogsQuery["rosterCharacters"]> => {
        const response = await execute<RosterLogsQuery, RosterLogsQueryVariables>(rosterLogsQuery, {
          region,
          characters: chunk,
          difficulty,
          zoneId,
        });
        return response.rosterCharacters;
      },
    })),
  });

  return useMemo(
    () =>
      chunks.map((_, i) => {
        const core = coreResults[i];
        const rio = rioResults[i];
        const logs = logsResults[i];
        return {
          // Every part answers 1:1 with the request (the backend pads invalid
          // entries with notFound placeholders rather than dropping them), so
          // parts merge by position.
          data: core?.data?.map((row, j) => ({
            ...row,
            character: row.character
              ? {
                  ...row.character,
                  ...(rio?.data?.[j]?.character ?? {}),
                  ...(logs?.data?.[j]?.character ?? {}),
                }
              : null,
            pending: { rio: isPending(rio), logs: isPending(logs) },
          })),
          isError: Boolean(core?.isError || rio?.isError || logs?.isError),
          // Retry only the parts that failed - a RIO outage shouldn't re-spend
          // Blizzard and WarcraftLogs quota for the whole chunk.
          refetch: () => {
            for (const part of [core, rio, logs]) {
              if (part?.isError) part.refetch();
            }
          },
        };
      }),
    // chunks is rebuilt every render, so it can't be a dependency itself - its
    // length is all the mapping below actually reads from it.
    [chunks.length, coreResults, rioResults, logsResults]
  );
};

/** Pre-fill the part caches for an edited character list from rows we already
 *  have, so an edit re-renders in place instead of dropping every card back to
 *  a skeleton (and refetching data that can't have changed). Each part seeds
 *  independently, so an edit made before RIO or the parses landed still carries
 *  the identity rows across. */
export const useSeedRosterChunks = (region: string, difficulty: Difficulty) => {
  const queryClient = useQueryClient();

  return (previous: RosterCharacterKey[], next: RosterCharacterKey[]) => {
    const previousChunks = chunkCharacters(previous);
    const nextChunks = chunkCharacters(next);

    for (const part of ROSTER_PARTS) {
      const scope = part === "logs" ? difficulty : undefined;
      // Rows keyed by character, harvested from the chunks we already fetched.
      const byKey = new Map<string, unknown>();
      previousChunks.forEach((chunk) => {
        const state = queryClient.getQueryState<unknown[]>(
          queryKeys.rosterChunk(part, region, chunk, scope)
        );
        // placeholderData is observer-level and never written to the cache, so
        // the previous difficulty's parses can't be read back out of the new
        // difficulty's key - a present, non-invalidated payload is real.
        if (!state?.data || state.isInvalidated) return;
        chunk.forEach((c, i) => {
          const row = state.data?.[i];
          if (row !== undefined) byKey.set(`${c.name}:${c.realm}`, row);
        });
      });

      nextChunks.forEach((chunk) => {
        const rows = chunk.map((c) => byKey.get(`${c.name}:${c.realm}`));
        // Only seed fully-known chunks - an added member still needs a real fetch.
        if (rows.every((r) => r !== undefined)) {
          queryClient.setQueryData(queryKeys.rosterChunk(part, region, chunk, scope), rows);
        }
      });
    }
  };
};
