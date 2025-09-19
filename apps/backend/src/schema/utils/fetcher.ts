import fetch, {RequestInit} from 'node-fetch';

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Combines a base URL and a queries object into a full URL with query parameters.
 * @param baseUrl The base URL (e.g., 'https://api.example.com/resource')
 * @param queries An object of key-value pairs for query parameters
 * @returns The full URL with encoded query parameters
 */
export function buildUrlWithQueries(baseUrl: string, queries: Record<string, string | number | boolean>): string {
  const url = new URL(baseUrl);
  Object.entries(queries).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}