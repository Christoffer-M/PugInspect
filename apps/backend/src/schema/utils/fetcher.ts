
import { GraphQLResolveInfo } from "graphql";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
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
