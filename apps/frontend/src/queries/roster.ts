import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import {
  CreateRosterMutation,
  CreateRosterMutationVariables,
  Difficulty,
  RosterCharactersQuery,
  RosterCharactersQueryVariables,
  RosterQuery,
  RosterQueryVariables,
  UpdateRosterMutation,
  UpdateRosterMutationVariables,
} from "../graphql/graphql";
import { queryKeys } from "../queryKeys";

export type RosterEntry = RosterCharactersQuery["rosterCharacters"][number];
export type RosterCharacterKey = { name: string; realm: string };

/** Server-side per-request cap — a 30-man roster becomes 3 chunked requests,
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

const rosterCharactersQuery = graphql(`
  query RosterCharacters(
    $region: String!
    $characters: [RosterCharacterInput!]!
    $difficulty: Difficulty
    $zoneId: Int
  ) {
    rosterCharacters(region: $region, characters: $characters, difficulty: $difficulty, zoneId: $zoneId) {
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
 * localStorage — whoever holds it edits the slug in place; rosters are
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

/** Forget a secret the server has rejected — keeping it leaves the edit UI
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
    // Rosters are immutable — a slug's character list never changes.
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

/** One query per chunk of ≤10 characters, so cards stream in as chunks land. */
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
}) => {
  const chunks: RosterCharacterKey[][] = [];
  for (let i = 0; i < characters.length; i += ROSTER_CHUNK_SIZE) {
    chunks.push(characters.slice(i, i + ROSTER_CHUNK_SIZE));
  }
  return useQueries({
    // Without combine, useQueries returns a fresh array reference every render,
    // which defeats every downstream useMemo (entries, sorting, summary stats).
    // combine's output is memoized until an underlying query actually changes.
    combine: (results) =>
      results.map((r) => ({
        data: r.data,
        isError: r.isError,
        isPlaceholderData: r.isPlaceholderData,
        refetch: r.refetch,
      })),
    queries: chunks.map((chunk) => ({
      queryKey: queryKeys.rosterChunk(region, difficulty, chunk),
      enabled,
      retry: false,
      // Keep showing the previous difficulty's cards while the new one loads.
      placeholderData: (prev: RosterEntry[] | undefined) => prev,
      // Roster lookups fan out to three upstreams per character — errors render
      // inline per chunk, not as a global red toast per failed chunk.
      meta: { suppressErrorToast: true },
      queryFn: async (): Promise<RosterEntry[]> => {
        const response = await execute<RosterCharactersQuery, RosterCharactersQueryVariables>(
          rosterCharactersQuery,
          { region, characters: chunk, difficulty, zoneId }
        );
        return response.rosterCharacters;
      },
      // Mirrors the backend's 900s WCL/RIO snapshot TTL.
      gcTime: 1000 * 60 * 15,
      staleTime: 1000 * 60 * 15,
    })),
  });
};
