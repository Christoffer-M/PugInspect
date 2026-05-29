import { Group, Skeleton, Stack, Text } from "@mantine/core";
import { getParseColor } from "../../util/util";
import classes from "./PerformanceSummary.module.css";

type PerformanceSummaryProps = {
  metricLabel: string;
  best: number | null | undefined;
  median: number | null | undefined;
  isFetching: boolean;
};

export function PerformanceSummary({ metricLabel, best, median, isFetching }: PerformanceSummaryProps) {
  return (
    <Group className={classes.perf} grow>
      <Stack className={classes.cell} align="center" gap={2}>
        <Text className={classes.cellLabel} m={0}>Best {metricLabel} average</Text>
        {isFetching ? (
          <Skeleton h={28} w={60} mt={2} />
        ) : (
          <Text className={classes.cellVal} m={0} style={{ color: best != null ? getParseColor(best) : "var(--mantine-color-dark-2)" }}>
            {best != null ? best.toFixed(2) : "—"}
          </Text>
        )}
      </Stack>
      <Stack className={classes.cell} align="center" gap={2}>
        <Text className={classes.cellLabel} m={0}>Median {metricLabel} average</Text>
        {isFetching ? (
          <Skeleton h={28} w={60} mt={2} />
        ) : (
          <Text className={classes.cellVal} m={0} style={{ color: median != null ? getParseColor(median) : "var(--mantine-color-dark-2)" }}>
            {median != null ? median.toFixed(2) : "—"}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
