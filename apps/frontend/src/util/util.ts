import { MantineTheme } from "@mantine/core";

export const GetWarcraftLogRankingColors = (
  percent: number,
  theme: MantineTheme,
) => {
  if (percent < 25) return theme.colors.gray[7];
  if (percent < 50) return theme.colors.green[5];
  if (percent < 75) return theme.colors.blue[5];
  if (percent < 90) return theme.colors.violet[5];
  if (percent < 100) return theme.colors.orange[5];
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
  const [, region, realm, name] = match;
  if (!region || !realm || !name) return null;
  return {
    region: region.toUpperCase(),
    realm,
    name,
  };
}
