import React from "react";
import {
  Table,
  Skeleton,
  Paper,
  useMantineTheme,
  Title,
  SegmentedControl,
  Stack,
  Text,
  Grid,
  Group,
  Image,
} from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import {
  CharacterLogsQuery,
  Difficulty,
  Maybe,
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
  class?: Maybe<string> | undefined;
  isFetching: boolean;
};

const icons = import.meta.glob("/src/assets/class-icons/*.svg", {
  eager: true,
  import: "default",
});

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  isFetching,
  class: className,
}) => {
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

  const getClassImageSrc = (spec: string | undefined | null) => {
    if (!className || !spec) return null;
    const key = `/src/assets/class-icons/classicon_${className.replace(/\s+/g, "").toLowerCase()}_${spec.toLowerCase()}.svg`;
    return icons[key] as string | undefined;
  };

  const navigate = useNavigate();
  const theme = useMantineTheme();
  const rows = rankings?.map((ranking) => (
    <Table.Tr key={ranking.encounter?.id ?? Math.random()}>
      <Table.Td c={ranking.medianPercent ? undefined : "dimmed"}>
        {ranking.encounter?.name}
      </Table.Td>
      <Table.Td
        c={
          ranking.rankPercent
            ? GetWarcraftLogRankingColors(ranking.rankPercent, theme)
            : "dimmed"
        }
        fw={ranking.rankPercent ? 700 : undefined}
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
        fw={ranking.medianPercent ? 700 : undefined}
      >
        {ranking.medianPercent != null
          ? Math.floor(ranking.medianPercent).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          : "N/A"}
      </Table.Td>
      <Table.Td
        c={ranking.totalKills ? undefined : "dimmed"}
        fw={ranking.totalKills ? 700 : undefined}
      >
        {ranking.totalKills?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }) || "N/A"}
      </Table.Td>
      <Table.Td>
        {ranking.spec && className && (
          <Image
            h={22}
            w={22}
            fit="contain"
            radius={"xs"}
            alt={`${className} ${ranking.spec}`}
            src={getClassImageSrc(ranking.spec)}
          />
        )}
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
    <Stack w={"100%"} gap={0}>
      <Group justify="space-between" align="center" mb={"xs"}>
        <Title order={3}>Raid logs</Title>
      </Group>

      <Paper withBorder w="100%">
        <Grid gutter={"md"} p={"xs"}>
          <Grid.Col span={"auto"}>
            <Stack align="center" w={"100%"} gap={"xs"} flex={1}>
              <Text m="0" fw={500} w={"fit-content"}>
                Difficulty
              </Text>
              <SegmentedControl
                w={"100%"}
                data={difficultyOrder.map((difficulty) => ({
                  label: difficulty,
                  value: difficulty,
                }))}
                value={searchDifficulty ?? difficulty ?? difficultyOrder[0]}
                onChange={(value) => {
                  if (value == null) return;
                  setSearch({ difficulty: value as Difficulty });
                }}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={"auto"}>
            <Stack align="center" w={"100%"} gap={"xs"} flex={1}>
              <Text m="0" fw={500} w={"fit-content"}>
                Role
              </Text>
              <SegmentedControl
                w={"100%"}
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
          </Grid.Col>
          <Grid.Col span={"auto"}>
            <Stack align="center" w={"100%"} gap={"xs"} flex={1}>
              <Text m="0" fw={500} w={"fit-content"}>
                Metric
              </Text>
              <SegmentedControl
                w={"100%"}
                data={Object.values(Metric).map((metric) => ({
                  label: metric.toUpperCase(),
                  value: metric,
                }))}
                value={searchMetric ?? metric ?? Metric.Dps}
                onChange={(value) => {
                  if (value == null) return;
                  setSearch({ metric: value as Metric });
                }}
              />{" "}
            </Stack>
          </Grid.Col>
        </Grid>

        <Table verticalSpacing={0} horizontalSpacing={"md"}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Encounter</Table.Th>
              <Table.Th>Rank Percent</Table.Th>
              <Table.Th>Median Percent</Table.Th>
              <Table.Th>Kills</Table.Th>
              <Table.Th>Spec</Table.Th>
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
    </Stack>
  );
};
