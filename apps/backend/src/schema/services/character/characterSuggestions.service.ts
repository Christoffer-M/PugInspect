import { trace } from "@opentelemetry/api";
import type { QueryCharacterSuggestionsArgs } from "@repo/graphql-types";
import { searchDirectory } from "../../../db/characterDirectory.js";
import { isKnownRealm, normalizeName, realmDisplayName, realmSlugsStartingWith, resolveRealm } from "../../utils/helpers.js";
import { createLogger } from "../../utils/logger.js";
import { withSpan } from "../../utils/spans.js";
import { RaiderIOService, type CharacterSearchResponse } from "../raiderIo/raiderio.services.js";

const logger = createLogger({ service: "CharacterSuggestions" });

/**
 * Split typed input into a name prefix and the realms it may be on. "Name-Realm"
 * splits on the first dash (names can't contain one). A realm we know matches
 * exactly; anything else is treated as half-typed and matches every realm whose
 * name starts with it, so `realms` can come back empty. null realms = any realm.
 */
export function parseSuggestionInput(
  searchString: string,
  region: string
): { name: string; realms: string[] | null } | null {
  const input = searchString.trim();
  const dash = input.indexOf("-");
  const name = normalizeName(dash === -1 ? input : input.slice(0, dash));
  if (!name) return null;
  const realm = dash === -1 ? "" : input.slice(dash + 1).trim();
  if (!realm) return { name, realms: null };
  if (isKnownRealm(realm, region)) return { name, realms: [resolveRealm(realm, region)] };
  return { name, realms: realmSlugsStartingWith(realm, region) };
}

/**
 * Suggestions from our own character directory, with Raider.IO as the fallback
 * only when the directory has nothing — as the user keeps typing, a character
 * we don't know narrows our results to zero and Raider.IO takes over.
 * The span attributes are the evidence for whether Raider.IO can be dropped.
 */
export function getCharacterSuggestions(args: QueryCharacterSuggestionsArgs): Promise<CharacterSearchResponse[]> {
  return withSpan("character.suggestions", {}, async () => {
    const span = trace.getActiveSpan();
    const region = args.region.toLowerCase();
    span?.setAttribute("app.suggest.region", region);
    const parsed = parseSuggestionInput(args.searchString, region);

    let own: CharacterSearchResponse[] = [];
    if (parsed && parsed.realms?.length !== 0) {
      try {
        const rows = await searchDirectory(region, parsed.name, parsed.realms);
        own = rows.map((r) => ({
          // Stored lowercase; WoW itself capitalizes only the first letter.
          name: r.name.charAt(0).toUpperCase() + r.name.slice(1),
          realm: realmDisplayName(r.realm, region),
          realmSlug: r.realm,
          region: region.toUpperCase(),
        }));
      } catch (error) {
        // Degrade to Raider.IO rather than failing the typeahead.
        span?.recordException(error as Error);
        logger.warn("Character directory search failed", { error: String(error) });
      }
    }

    span?.setAttribute("app.suggest.own_count", own.length);
    span?.setAttribute("app.suggest.fallback_used", own.length === 0);
    if (own.length > 0) return own;

    const fallback = await RaiderIOService.getCharacterSuggestions(args);
    span?.setAttribute("app.suggest.fallback_count", fallback.length);
    return fallback;
  });
}
