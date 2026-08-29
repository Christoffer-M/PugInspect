
import { GraphQLResolveInfo } from "graphql";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly apiMessage: string
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    let apiMessage = "";
    try {
      apiMessage = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      // non-JSON error body — status alone will have to do
    }
    throw new FetchError(
      `Fetch failed: ${res.status} ${res.statusText}${apiMessage ? ` — ${apiMessage}` : ""}`,
      res.status,
      apiMessage
    );
  }

  return res.json() as Promise<T>;
}

export function isFieldRequested(
  info: GraphQLResolveInfo,
  field: string
): boolean {
  const parsed = parseResolveInfo(info) as ResolveTree;
  if (!parsed) return false;

  // Look into the Character type fields being requested
  return Boolean(parsed.fieldsByTypeName?.Character?.[field]);
}

export function isAnyFieldRequestedBesides(
  info: GraphQLResolveInfo,
  excluded: Set<string>
): boolean {
  const parsed = parseResolveInfo(info) as ResolveTree;
  if (!parsed) return true; // safe default: assume data is needed

  return Object.keys(parsed.fieldsByTypeName?.Character ?? {}).some(
    (f) => !excluded.has(f)
  );
}

/** Like isFieldRequested, but for Query.rosterCharacters - the Character type
 * sits one level down, under RosterEntry.character. */
export function isRosterCharacterFieldRequested(
  info: GraphQLResolveInfo,
  field: string
): boolean {
  const parsed = parseResolveInfo(info) as ResolveTree | null;
  const character = parsed?.fieldsByTypeName?.RosterEntry?.character as ResolveTree | undefined;
  return Boolean(character?.fieldsByTypeName?.Character?.[field]);
}
