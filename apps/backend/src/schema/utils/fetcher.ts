
import { GraphQLResolveInfo } from "graphql";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";

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
    throw Object.assign(
      new Error(`Fetch failed: ${res.status} ${res.statusText}${apiMessage ? ` — ${apiMessage}` : ""}`),
      { status: res.status, apiMessage }
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
