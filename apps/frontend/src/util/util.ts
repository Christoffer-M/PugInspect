import { MantineTheme } from "@mantine/core";

export const GetWarcraftLogRankingColors = (
  percent: number,
  theme: MantineTheme,
) => {
  if (percent <= 25) return theme.colors.gray[5];
  if (percent <= 50) return theme.colors.green[5];
  if (percent <= 75) return theme.colors.blue[5];
  if (percent <= 90) return theme.colors.violet[5];
  if (percent <= 100) return theme.colors.orange[5];
  return theme.colors.yellow[2];
};
