import { Paper, Group, Stack, Text, Title, Skeleton } from "@mantine/core";
import { useMantineTheme } from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../../util/util";

type PerformanceSummaryProps = {
  metricLabel: string;
  best: number | null | undefined;
  median: number | null | undefined;
  isFetching: boolean;
};

export function PerformanceSummary({ metricLabel, best, median, isFetching }: PerformanceSummaryProps) {
  const theme = useMantineTheme();

  return (
    <Paper flex={1} radius={0}>
      <Group p="xs" w="100%" align="center" justify="space-around">
        <Stack gap={0} align="center">
          <Text m="0" fw={500} w="fit-content">Best {metricLabel} average</Text>
          {isFetching ? (
            <Skeleton height={25} miw={10} />
          ) : (
            <Title
              order={2}
              m={0}
              c={best ? GetWarcraftLogRankingColors(best, theme) : undefined}
              fw={700}
            >
              {best || "-"}
            </Title>
          )}
        </Stack>
        <Stack gap={0} align="center">
          <Text m="0" fw={500} w="fit-content">Median {metricLabel} average</Text>
          {isFetching ? (
            <Skeleton height={25} miw={10} />
          ) : (
            <Title
              order={2}
              m={0}
              c={median ? GetWarcraftLogRankingColors(median, theme) : undefined}
              fw={700}
            >
              {median || "-"}
            </Title>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
