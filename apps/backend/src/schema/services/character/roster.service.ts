import { GraphQLError } from "graphql";
import type { Difficulty, RosterCharacterInput, SpecRole } from "@repo/graphql-types";
import { getCharacterProfiles } from "./characterProfile.service.js";
import { WarcraftLogsService } from "../warcraftLogs/warcraftlogs.services.js";
import { SPECS } from "../mythicPlusStats/specs.js";
import type { BlizzardCharacterProfile } from "../blizzard/model/CharacterProfile.js";
import { normalizeName, normalizeRealm } from "../../utils/helpers.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger({ service: "Roster" });

/** Hard cap per request - the client chunks a 30-man roster into 3 calls. */
export const ROSTER_CHUNK_LIMIT = 10;

/** Upstream fan-out cap: 5 characters in flight × ≤3 upstreams each.
 *  Same pacing pattern as scripts/backfill-alt-links.ts. */
const CONCURRENCY = 5;

// Blizzard reports class/spec by display name ("Death Knight" / "Beast Mastery"),
// which is exactly SPECS' className/specName.
const ROLE_BY_CLASS_SPEC = new Map(SPECS.map((s) => [`${s.className}/${s.specName}`, s.role]));

// RIO reports the role directly; its vocabulary differs from SpecRole.
const RIO_ROLES: Record<string, SpecRole> = { TANK: "TANK", HEALING: "HEALER", DPS: "DPS" };

/** Role from the Blizzard profile, falling back to RaiderIO when Blizzard is
 *  down - without the fallback a healer would be ranked on damage and dropped
 *  from the composition counts during a Blizzard outage. */
export function roleForProfiles(profiles: {
  blizzardProfile?: BlizzardCharacterProfile;
  rioProfile?: { active_spec_role?: string } | undefined;
}): SpecRole | null {
  const blizz = profiles.blizzardProfile;
  if (blizz) {
    const role = ROLE_BY_CLASS_SPEC.get(
      `${blizz.character_class.name}/${blizz.active_spec.name}`
    );
    if (role) return role;
  }
  const rioRole = profiles.rioProfile?.active_spec_role;
  return rioRole ? (RIO_ROLES[rioRole.toUpperCase()] ?? null) : null;
}

export type RosterProfileBundle = {
  name: string;
  realm: string;
  role: SpecRole | null;
  profiles: Awaited<ReturnType<typeof getCharacterProfiles>>;
};

/**
 * Look up a chunk of roster characters. Never throws per character - a typo'd
 * name simply yields empty profiles (the resolver marks it notFound).
 */
const EMPTY_PROFILES: Awaited<ReturnType<typeof getCharacterProfiles>> = {
  blizzardProfile: undefined,
  blizzardAvatarUrl: undefined,
  characterId: null,
  rioProfile: undefined,
  warcraftLogsProfile: undefined,
  equipment: undefined,
};

export async function getRosterProfiles(
  args: {
    region: string;
    characters: RosterCharacterInput[];
    difficulty?: Difficulty | null;
    zoneId?: number | null;
  },
  options: {
    cacheOnly: boolean;
    raiderIoRequested: boolean;
    raidLogsRequested: boolean;
    /** Rank on WCL's Mythic+ "points" metrics (what the character page shows) instead of dps/hps. */
    mythicPlusLogsRequested?: boolean;
  }
): Promise<RosterProfileBundle[]> {
  if (args.characters.length === 0 || args.characters.length > ROSTER_CHUNK_LIMIT) {
    throw new GraphQLError(`characters must contain 1–${ROSTER_CHUNK_LIMIT} entries`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  // The response is strictly 1:1 with the request - the client maps entries
  // back to its list by position, so invalid or duplicate inputs become
  // notFound placeholders instead of being silently dropped (which would
  // shift every later card onto the wrong character).
  const seen = new Set<string>();
  const chars = args.characters.map((c) => {
    const name = normalizeName(c.name);
    const realm = normalizeRealm(c.realm);
    const key = `${name}:${realm}`;
    // Same sanity caps as createRoster - oversized input never reaches
    // upstream URLs or cache keys.
    const skip = !name || !realm || name.length > 50 || realm.length > 100 || seen.has(key);
    if (!skip) seen.add(key);
    return { name, realm, skip };
  });

  const lookupOne = async (c: {
    name: string;
    realm: string;
    skip: boolean;
  }): Promise<RosterProfileBundle> => {
    if (c.skip) return { name: c.name, realm: c.realm, role: null, profiles: EMPTY_PROFILES };
    const charArgs = {
      name: c.name,
      realm: c.realm,
      region: args.region,
      difficulty: args.difficulty,
      zoneId: args.zoneId,
    };
    // Phase 1: identity (Blizzard, usually a 24h-cached DB hit) + RIO.
    // getCharacterProfiles allSettles its upstreams - a missing character
    // comes back as empty profiles, never a rejection.
    const profiles = await getCharacterProfiles(charArgs, {
      blizzardRequested: true,
      raiderIoRequested: options.raiderIoRequested,
      raidLogsRequested: false,
      mythicPlusLogsRequested: false,
      gearRequested: false,
      bypassCache: false,
      cacheOnly: options.cacheOnly,
    });

    const role = roleForProfiles(profiles);
    const found = profiles.blizzardProfile || profiles.rioProfile;

    // Phase 2: WCL parses, only for characters that exist - sequenced after
    // the profile so healers can be ranked on healing. Omitting the metric
    // makes WCL rank everyone on damage, healers included. Circuit checked
    // per character so a breaker tripped mid-chunk stops the remaining calls.
    if (found && (options.raidLogsRequested || options.mythicPlusLogsRequested) && !WarcraftLogsService.isCircuitOpen()) {
      try {
        const metric = options.mythicPlusLogsRequested
          ? role === "HEALER" ? "points_and_healing" : "points_and_damage"
          : role === "HEALER" ? "hps" : undefined;
        const wcl = await WarcraftLogsService.getCharacterProfile(
          { ...charArgs, metric },
          false,
          options.cacheOnly
        );
        profiles.warcraftLogsProfile = wcl?.data;
      } catch (err) {
        // Degrade to a card without parses; rate limits open the breaker upstream.
        logger.warn("Roster WCL lookup failed", { name: c.name, realm: c.realm, error: String(err) });
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
