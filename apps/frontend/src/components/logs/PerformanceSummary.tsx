import { Skeleton } from "@mantine/core";
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
    <div className={classes.perf}>
      <div className={classes.cell}>
        <span className={classes.cellLabel}>Best {metricLabel} average</span>
        {isFetching ? (
          <Skeleton h={28} w={60} mt={2} />
        ) : (
          <span
            className={classes.cellVal}
            style={{ color: best != null ? getParseColor(best) : "var(--mantine-color-dark-2)" }}
          >
            {best != null ? best.toFixed(2) : "—"}
          </span>
        )}
      </div>
      <div className={classes.cell}>
        <span className={classes.cellLabel}>Median {metricLabel} average</span>
        {isFetching ? (
          <Skeleton h={28} w={60} mt={2} />
        ) : (
          <span
            className={classes.cellVal}
            style={{ color: median != null ? getParseColor(median) : "var(--mantine-color-dark-2)" }}
          >
            {median != null ? median.toFixed(2) : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
