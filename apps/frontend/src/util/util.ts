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

/**
 * Custom hook to debounce a value.
 *
 * @param value The input value to debounce.
 * @param delay The debounce delay in ms.
 * @returns The debounced value.
 */
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
