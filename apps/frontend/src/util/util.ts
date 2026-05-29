import { MantineTheme } from "@mantine/core";
import { useEffect, useState } from "react";

export const GetWarcraftLogRankingColors = (
  percent: number,
  theme: MantineTheme,
) => {
  if (percent < 25) return theme.colors.gray[7];
  if (percent < 50) return theme.colors.green[5];
  if (percent < 75) return theme.colors.blue[6];
  if (percent < 95) return theme.colors.violet[5];
  if (percent < 99) return theme.colors.orange[5];
  if (percent < 100) return theme.colors.pink[4];
  return theme.colors.yellow[2];
};

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

export function parseRaiderIoUrl(
  url: string,
): { region: string; realm: string; name: string } | null {
  const match = url.match(
    /raider\.io\/characters\/([^/]+)\/([^/]+)\/([^/?#]+)/i,
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

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "-";
  return Math.floor(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
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