/**
 * Shape of the untyped `JSON` blob returned by
 * `worldData.encounter.characterRankings`. Verified against the live API.
 *
 * `count` is the number of rows on THIS page, not the total — there is no total
 * anywhere in the response. `hasMorePages` still true on page 20 means the query
 * hit WCL's hard 2,000-row ceiling and the slice is truncated.
 */
export type CharacterRankingsPage = {
  page?: number;
  hasMorePages?: boolean;
  count?: number;
  rankings?: CharacterRankingRow[];
};

export type CharacterRankingRow = {
  name?: string;
  /** Class slug, e.g. "DeathKnight" — no spaces. */
  class?: string;
  /** Spec slug, e.g. "BeastMastery" — no spaces. */
  spec?: string;
  /** Throughput for the requested metric (dps or hps). */
  amount?: number;
  /** Keystone level of the run. */
  bracketData?: number;
  hardModeLevel?: number;
  duration?: number;
  startTime?: number;
  score?: number;
  medal?: string;
  affixes?: number[];
  faction?: number;
  leaderboard?: number;
  /**
   * Present only with `includeCombatantInfo: true`, and missing on rows whose
   * log carried no combatant info (1–8% of rows, measured). `talentID` is a
   * trait-node-entry id — see `HERO_TALENTS` for the one that names the hero
   * talent tree.
   */
  talents?: { talentID?: number; points?: number }[];
  report?: { code?: string; fightID?: number; startTime?: number };
  guild?: { id?: number; name?: string; faction?: number };
  server?: { id?: number; name?: string; region?: string };
};

export type MythicPlusZone = {
  id?: number;
  name?: string;
  brackets?: { min?: number; max?: number; bucket?: number };
  encounters?: { id?: number; name?: string }[];
};
