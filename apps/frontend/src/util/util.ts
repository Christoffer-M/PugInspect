export {
  normalizeRealm,
  getParseColor,
  CLASS_COLORS,
  getClassColor,
  WOW_QUALITY_COLORS,
  getQualityColor,
} from "@repo/ui";

export const upperCaseFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export function parseCharacterUrl(
  url: string,
): { region: string; realm: string; name: string } | null {
  const match = url.match(
    /(?:raider\.io\/characters|puginspect\.com)\/([^/]+)\/([^/]+)\/([^/?#]+)/i,
  );
  if (!match) return null;
  const [, region, rawRealm, name] = match;
  if (!region || !rawRealm || !name) return null;
  // Only real regions - a pasted puginspect.com/roster/{region}/{slug} link
  // would otherwise parse as a character on region "roster".
  if (!/^(us|eu|kr|tw)$/i.test(region)) return null;

  return {
    region: region.toUpperCase(),
    realm: decodeURIComponent(rawRealm),
    name: decodeURIComponent(name),
  };
}

export function timeAgo(time: string | number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Last 14 UTC days, zero-filled from the sparse per-day counts. */
export function fillDays(perDay: { date: string; count: number }[]) {
  const byDate = new Map(perDay.map((d) => [d.date, d.count]));
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return { key, day: String(date.getUTCDate()), count: byDate.get(key) ?? 0 };
  });
}
