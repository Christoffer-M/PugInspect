import React from "react";
import {
  Table,
  Skeleton,
  Paper,
  useMantineTheme,
  Title,
  Group,
  Select,
} from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import {
  CharacterLogsQuery,
  Difficulty,
  Metric,
  RoleType,
} from "../graphql/graphql";
import { useNavigate, useSearch } from "@tanstack/react-router";

export type CharacterLogsWarcraftLogs = NonNullable<
  CharacterLogsQuery["character"]
>["warcraftLogs"];

const difficultyOrder = ["LFR", "Normal", "Heroic", "Mythic"];

type LogsTableProps = {
  logs?: CharacterLogsWarcraftLogs | null;
  isFetching: boolean;
};

export const LogsTable: React.FC<LogsTableProps> = ({ logs, isFetching }) => {
  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
  } = useSearch({
    from: "/$region/$realm/$name",
  });

  const metric = logs?.metric;
  const rankings = logs?.raidRankings || [];
  const difficulty = logs?.difficulty;

  const navigate = useNavigate();
  const theme = useMantineTheme();
  const rows = rankings?.map((ranking) => (
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
      <Group justify="space-between" align="flex-start" p="sm">
        <Title order={3}>Raid logs</Title>
        <Group>
          <Select
            w={100}
            label="Role"
            labelProps={{ size: "xs" }}
            onChange={(value) => {
              if (value == null) return;
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, roleType: value as RoleType }),
              });
            }}
            value={searchRoleType}
            data={Object.values(RoleType)}
            comboboxProps={{
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />
          <Select
            w={100}
            label="Metric"
            labelProps={{ size: "xs" }}
            onChange={(value) => {
              if (value == null) return;
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, metric: value as Metric }),
              });
            }}
            value={searchMetric ?? metric}
            data={Object.values(Metric)}
            comboboxProps={{
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />
          <Select
            w={100}
            label="Difficulty"
            labelProps={{ size: "xs" }}
            onChange={(value) => {
              if (value == null) return;
              navigate({
                to: ".",
                search: (prev) => ({
                  ...prev,
                  difficulty: value as Difficulty,
                }),
              });
            }}
            value={searchDifficulty ?? difficulty}
            data={Object.values(Difficulty).toSorted(
              (a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b),
            )}
            comboboxProps={{
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />
        </Group>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Encounter</Table.Th>
            <Table.Th>Rank Percent</Table.Th>
            <Table.Th>Median Percent</Table.Th>
            <Table.Th>Highest {metric?.toUpperCase()}</Table.Th>
            <Table.Th>Kills</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isFetching ? (
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
