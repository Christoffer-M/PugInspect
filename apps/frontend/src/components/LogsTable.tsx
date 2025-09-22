import React from "react";
import { Table, Skeleton, Paper, useMantineTheme, Title } from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import { Metric, RaidRanking } from "../graphql/graphql";

type LogsTableProps = {
  data: RaidRanking[];
  metric: Metric;
  loading?: boolean;
};

export const LogsTable: React.FC<LogsTableProps> = ({
  data,
  metric,
  loading,
}) => {
  const theme = useMantineTheme();
  const rows = data.map((ranking) => (
    <Table.Tr key={ranking.encounter?.id ?? Math.random()}>
      <Table.Td>{ranking.encounter?.name}</Table.Td>
      <Table.Td
        c={
          ranking.rankPercent
            ? GetWarcraftLogRankingColors(ranking.rankPercent, theme)
            : undefined
        }
        fw={500}
      >
        {ranking.rankPercent?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }) || "N/A"}
      </Table.Td>
      <Table.Td
        c={
          ranking.medianPercent
            ? GetWarcraftLogRankingColors(ranking.medianPercent, theme)
            : undefined
        }
        fw={500}
      >
        {ranking.medianPercent?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }) || "N/A"}
      </Table.Td>
      <Table.Td>
        {ranking.bestAmount?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }) || "N/A"}
      </Table.Td>
      <Table.Td>
        {ranking.totalKills?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }) || "N/A"}
      </Table.Td>
    </Table.Tr>
  ));

  const skeletonRows = Array.from({ length: 5 }).map((_, idx) => (
    <Table.Tr key={idx}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Table.Td key={i}>
          <Skeleton height={20} />
        </Table.Td>
      ))}
    </Table.Tr>
  ));

  return (
    <Paper withBorder w="100%">
      <Title order={3} pl="xs" pt={"xs"}>
        Raid logs
      </Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Encounter</Table.Th>
            <Table.Th>Rank Percent</Table.Th>
            <Table.Th>Median Percent</Table.Th>
            <Table.Th>Highest {metric.toUpperCase()}</Table.Th>
            <Table.Th>Kills</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            skeletonRows
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={5} style={{ textAlign: "center" }}>
                No logs available.
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};
