import { useEffect, useState } from "react";

export const normalizeRealm = (realm: string) =>
  realm
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

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

  return {
    region: region.toUpperCase(),
    realm: decodeURIComponent(rawRealm),
    name: decodeURIComponent(name),
  };
}

export function getParseColor(percent: number | null | undefined): string {
  if (percent == null) return "#5e6a82";
  if (percent < 25) return "#7a8290";
  if (percent < 50) return "#4ade80";
  if (percent < 75) return "#4d93ff";
  if (percent < 95) return "#b072f0";
  if (percent < 99) return "#ff8a3d";
  if (percent < 100) return "#ff6fae";
  return "#ffd34d";
}

export const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

export function getClassColor(className?: string | null): string {
  if (!className) return "#8a96aa";
  return CLASS_COLORS[className.toLowerCase()] ?? "#8a96aa";
}

/** Standard WoW item quality colors, keyed by the API's quality type token. */
export const WOW_QUALITY_COLORS: Record<string, string> = {
  POOR: "#9d9d9d",
  COMMON: "#ffffff",
  UNCOMMON: "#1eff00",
  RARE: "#0070dd",
  EPIC: "#a335ee",
  LEGENDARY: "#ff8000",
  ARTIFACT: "#e6cc80",
  HEIRLOOM: "#00ccff",
};

export function getQualityColor(quality?: string | null): string {
  if (!quality) return "#8a96aa";
  return WOW_QUALITY_COLORS[quality.toUpperCase()] ?? "#8a96aa";
}

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
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
