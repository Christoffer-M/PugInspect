import { GraphQLError } from "graphql";
import type { Difficulty, RosterCharacterInput, SpecRole } from "@repo/graphql-types";
import { getCharacterProfiles } from "./characterProfile.service.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { SPECS } from "../mythicPlusStats/specs.js";
import type { BlizzardCharacterProfile } from "../blizzard/model/CharacterProfile.js";
import { normalizeName, normalizeRealm } from "../../utils/helpers.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger({ service: "Roster" });

/** Hard cap per request — the client chunks a 30-man roster into 3 calls. */
export const ROSTER_CHUNK_LIMIT = 10;

/** Upstream fan-out cap: 5 characters in flight × ≤3 upstreams each.
 *  Same pacing pattern as scripts/backfill-alt-links.ts. */
const CONCURRENCY = 5;

// Blizzard reports class/spec by display name ("Death Knight" / "Beast Mastery"),
// which is exactly SPECS' className/specName.
const ROLE_BY_CLASS_SPEC = new Map(SPECS.map((s) => [`${s.className}/${s.specName}`, s.role]));

export function roleForBlizzardProfile(
  profile: BlizzardCharacterProfile | undefined
): SpecRole | null {
  if (!profile) return null;
  return (
    ROLE_BY_CLASS_SPEC.get(`${profile.character_class.name}/${profile.active_spec.name}`) ?? null
  );
}

export type RosterProfileBundle = {
  name: string;
  realm: string;
  role: SpecRole | null;
  profiles: Awaited<ReturnType<typeof getCharacterProfiles>>;
};

/**
 * Look up a chunk of roster characters. Never throws per character — a typo'd
 * name simply yields empty profiles (the resolver marks it notFound).
 */
export async function getRosterProfiles(
  args: {
    region: string;
    characters: RosterCharacterInput[];
    difficulty?: Difficulty | null;
    zoneId?: number | null;
  },
  cacheOnly: boolean
): Promise<RosterProfileBundle[]> {
  const seen = new Set<string>();
  const chars = args.characters
    .map((c) => ({ name: normalizeName(c.name), realm: normalizeRealm(c.realm) }))
    .filter((c) => {
      const key = `${c.name}:${c.realm}`;
      if (!c.name || !c.realm || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (chars.length === 0 || chars.length > ROSTER_CHUNK_LIMIT) {
    throw new GraphQLError(`characters must contain 1–${ROSTER_CHUNK_LIMIT} entries`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  // One circuit check for the whole chunk: when WCL is rate-limited, skip
  // parse lookups entirely and let cards degrade to "no parses" instead of
  // burning 10 requests into an open breaker.
  const wclAvailable = !WarcraftLogsService.isCircuitOpen();

  const lookupOne = async (c: { name: string; realm: string }): Promise<RosterProfileBundle> => {
    const charArgs = {
      name: c.name,
      realm: c.realm,
      region: args.region,
      difficulty: args.difficulty,
      zoneId: args.zoneId,
    };
    // Phase 1: identity (Blizzard, usually a 24h-cached DB hit) + RIO.
    // getCharacterProfiles allSettles its upstreams — a missing character
    // comes back as empty profiles, never a rejection.
    const profiles = await getCharacterProfiles(charArgs, {
      blizzardRequested: true,
      raiderIoRequested: true,
      raidLogsRequested: false,
      mythicPlusLogsRequested: false,
      gearRequested: false,
      bypassCache: false,
      cacheOnly,
    });

    const role = roleForBlizzardProfile(profiles.blizzardProfile);
    const found = profiles.blizzardProfile || profiles.rioProfile;

    // Phase 2: WCL parses, only for characters that exist — sequenced after
    // the profile so healers can be ranked on healing. Omitting the metric
    // makes WCL rank everyone on damage, healers included.
    if (found && wclAvailable) {
      try {
        const wcl = await WarcraftLogsService.getCharacterProfile(
          { ...charArgs, metric: role === "HEALER" ? "hps" : undefined },
          false,
          cacheOnly
        );
        profiles.warcraftLogsProfile = wcl?.data;
      } catch (err) {
        // Degrade to a card without parses; rate limits open the breaker upstream.
        logger.warn("Roster WCL lookup failed", { ...c, error: String(err) });
      }
    }

    return { name: c.name, realm: c.realm, role, profiles };
  };

  const results: RosterProfileBundle[] = [];
  for (let i = 0; i < chars.length; i += CONCURRENCY) {
    const batch = chars.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(lookupOne))));
  }
  return results;
}
