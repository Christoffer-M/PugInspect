import React from "react";
import {
  Table,
  Skeleton,
  Paper,
  useMantineTheme,
  Title,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Text,
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
            : "dimmed"
        }
        fw={500}
      >
        {ranking.rankPercent != null
          ? Math.floor(ranking.rankPercent).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          : "N/A"}
      </Table.Td>
      <Table.Td
        c={
          ranking.medianPercent
            ? GetWarcraftLogRankingColors(ranking.medianPercent, theme)
            : "dimmed"
        }
        fw={500}
      >
        {ranking.medianPercent != null
          ? Math.floor(ranking.medianPercent).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          : "N/A"}
      </Table.Td>
      <Table.Td c={ranking.bestAmount ? undefined : "dimmed"}>
        {ranking.bestAmount?.toLocaleString(undefined, {
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        }) || "N/A"}
      </Table.Td>
      <Table.Td c={ranking.totalKills ? undefined : "dimmed"}>
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

  const setSearch = (
    partial: Partial<{
      roleType: RoleType;
      metric: Metric;
      difficulty: Difficulty;
    }>,
  ) => {
    navigate({
      to: ".",
      search: (prev) => ({
        roleType: partial.roleType ?? prev.roleType ?? RoleType.Any,
        metric: partial.metric ?? prev.metric ?? metric ?? undefined,
        difficulty:
          partial.difficulty ?? prev.difficulty ?? difficulty ?? undefined,
      }),
    });
  };

  return (
    <Paper withBorder w="100%">
      <Group justify="space-between" align="flex-start" p="sm">
        <Title order={3}>Raid logs</Title>
        <Group>
          <Stack gap={0}>
            <Text m="0" size="sm" fw={500}>
              Role
            </Text>
            <SegmentedControl
              fullWidth
              data={Object.values(RoleType).map((role) => ({
                label: role,
                value: role,
              }))}
              value={searchRoleType}
              onChange={(value) => {
                if (value == null) return;
                setSearch({ roleType: value as RoleType });
              }}
            />
          </Stack>
          <Stack gap={0}>
            <Text m="0" size="sm" fw={500}>
              Metric
            </Text>
            <SegmentedControl
              fullWidth
              data={Object.values(Metric).map((metric) => ({
                label: metric.toUpperCase(),
                value: metric,
              }))}
              value={searchMetric ?? metric ?? Metric.Dps}
              onChange={(value) => {
                if (value == null) return;
                setSearch({ metric: value as Metric });
              }}
            />
          </Stack>
          <Select
            w={100}
            label="Difficulty"
            onChange={(value) => {
              if (value == null) return;
              setSearch({ difficulty: value as Difficulty });
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
