import { config } from "../../../config/index.js";
import { fetcher, FetchError } from "../../utils/fetcher.js";
import { createLogger } from "../../utils/logger.js";
import { trace } from "@opentelemetry/api";
import { dedupeInFlight, normalizeRealm, normalizeName, resolveRealm } from "../../utils/helpers.js";
import { markCache, markStale } from "../../utils/spans.js";
import { getCachedRioProfile, persistRioProfile } from "../../../db/persistence.js";
import { GraphQLError } from "graphql";
import {
  QueryCharacterArgs,
  QueryCharacterSuggestionsArgs,
} from "@repo/graphql-types";
import { RaiderIoCharacterSearchApiResponse } from "./model/CharacterSearchResponse.js";
import { RaiderIoCharacterApiResponse } from "./model/CharacterApiResponse.js";

const baseUrl = "https://raider.io/api/v1";
const baseApiUrl = "https://raider.io/api";

export type CharacterSearchResponse = {
  name: string;
  realm: string;
  realmSlug: string;
  region: string;
};

// Only recent runs: rating, best runs and raid progression come from Blizzard
// (blizzard/progression.service.ts), which answers in ~150ms where a cold
// RIO profile takes ~1s. Nothing else on the RIO profile is read.
const PROFILE_FIELDS = "mythic_plus_recent_runs";

const logger = createLogger({ service: "RaiderIO" });

export class RaiderIOService {
  private static buildUrlWithQueries(
    baseUrl: string,
    queries: Record<string, string | number | boolean>
  ): string {
    const url = new URL(baseUrl);
    Object.entries(queries).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    return url.toString();
  }

  static async getCharacterSuggestions(
    args: QueryCharacterSuggestionsArgs
  ): Promise<CharacterSearchResponse[]> {
    // Typeahead: a suggestion that arrives after 5s is useless, and without a
    // bound this had run to 17s when RaiderIO's search backend was degraded.
    const options: RequestInit = {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    };

    const query: Record<string, string | number | boolean> = {
      term: args.searchString,
      region: args.region,
    };

    const url = this.buildUrlWithQueries(`${baseApiUrl}/search`, query);

    try {
      const response = await fetcher<RaiderIoCharacterSearchApiResponse>(
        url,
        options
      );
      const filteredMatches = response.matches.filter(
        (m) => m.type === "character"
      );

      return filteredMatches.map((r) => ({
        name: r.name,
        realm: r.data.realm.name,
        // Resolved like every other lookup, not RIO's own slug: this is what
        // the character route and the DB key on.
        realmSlug: resolveRealm(r.data.realm.name, r.data.region.slug),
        region: r.data.region.short_name,
      }));
    } catch (error) {
      trace.getActiveSpan()?.recordException(error as Error);
      throw new GraphQLError(
        "Failed to fetch character suggestions from RaiderIO",
        {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        }
      );
    }
  }

  static async getCharacterProfile(
    args: QueryCharacterArgs,
    bypassCache = false,
    cacheOnly = false
  ): Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }> {
    const { name, realm, region } = args;
    const normalizedRealm = normalizeRealm(realm);
    const normalizedName = normalizeName(name);

    if (!bypassCache || cacheOnly) {
      const cached = await getCachedRioProfile({ region, realm: normalizedRealm, name: normalizedName }, cacheOnly);
      if (cached) {
        markCache("raiderio", "hit");
        return cached;
      }
    }
    markCache("raiderio", "miss");

    // Crawler traffic is served from cache only (stale allowed above) and must
    // never spend upstream API quota.
    if (cacheOnly) {
      throw new GraphQLError("Character not cached", { extensions: { code: "NOT_FOUND" } });
    }

    // Two companions watching the same listing fire identical lookups within
    // milliseconds — share one upstream fetch instead of spending quota twice.
    return dedupeInFlight(
      this.profileInFlight,
      `${region}:${normalizedRealm}:${normalizedName}`,
      () => this.fetchProfile(region, normalizedRealm, normalizedName)
    );
  }

  private static readonly profileInFlight = new Map<
    string,
    Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }>
  >();

  private static async fetchProfile(
    region: string,
    normalizedRealm: string,
    normalizedName: string
  ): Promise<{ data: RaiderIoCharacterApiResponse; fetchedAt: number }> {
    // With in-flight dedup, a hung fetch would hang every joined caller and pin
    // the map entry until restart — the timeout turns that into a bounded error.
    // 15s, matching the WCL client: measured Sept 2026 RaiderIO's p90 was ~8.7s
    // and its tail ran straight through the old 10s abort, timing out 31% of
    // profile fetches. Blizzard and WCL answer in 250-450ms from the same box.
    const options: RequestInit = { method: "GET", signal: AbortSignal.timeout(15_000) };
    const name = normalizedName;
    const realm = normalizedRealm;

    const query: Record<string, string | number | boolean> = {
      name: normalizedName,
      realm: normalizedRealm,
      region,
      access_key: config.raiderIoApiKey,
      fields: PROFILE_FIELDS,
    };

    const url = this.buildUrlWithQueries(
      `${baseUrl}/characters/profile`,
      query
    );

    try {
      const response = await fetcher<RaiderIoCharacterApiResponse>(url, options);
      const fetchedAt = Math.floor(Date.now() / 1000);
      persistRioProfile({ region, realm: normalizedRealm, name: normalizedName }, response, fetchedAt).catch((err: unknown) => {
        logger.warn("Failed to persist RIO profile to DB cache", { name, realm, region, error: String(err) });
      });
      return { data: response, fetchedAt };
    } catch (error) {
      // RaiderIO answers 400 for missing characters AND for malformed queries — the body
      // message ("Could not find requested character" / "Failed to find realm …") is the
      // only way to tell user input from our own bugs.
      if (
        error instanceof FetchError &&
        (error.status === 404 ||
          (error.status === 400 && /could not find|failed to find/i.test(error.apiMessage)))
      ) {
        throw new GraphQLError("Character not found on RaiderIO", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // RaiderIO is flaky enough that blanking the recent runs on every blip
      // is the worse answer for a character we looked up minutes ago. Serve
      // the expired snapshot instead — the TTL is 15 minutes, so "stale" is
      // the difference between one M+ run and none.
      trace.getActiveSpan()?.recordException(error as Error);
      const stale = await getCachedRioProfile({ region, realm: normalizedRealm, name: normalizedName }, true);
      if (stale) {
        markStale("raiderio", stale.fetchedAt);
        return stale;
      }

      throw new GraphQLError(
        "Failed to fetch character profile from RaiderIO",
        {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        }
      );
    }
  }
}
