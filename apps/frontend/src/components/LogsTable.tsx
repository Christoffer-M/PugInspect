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
  Center,
  Switch,
} from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import { getClassIconSrc } from "../assets/classIcons";
import {
  CharacterLogsQuery,
  Difficulty,
  Maybe,
  Metric,
  RoleType,
} from "../graphql/graphql";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CharacterQueryParams } from "../routes/$region.$realm.$name";

export type CharacterLogsWarcraftLogs = NonNullable<
  CharacterLogsQuery["character"]
>["warcraftLogs"];

const difficultyOrder = ["LFR", "Normal", "Heroic", "Mythic"];

type LogsTableProps = {
  logs?: CharacterLogsWarcraftLogs | null;
  class?: Maybe<string> | undefined;
  isFetching: boolean;
};

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  isFetching,
  class: className,
}) => {
  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    bracket: searchBracket,
  } = useSearch({
    from: "/$region/$realm/$name",
  });

  const metric = logs?.metric;
  const rankings = logs?.raidRankings || [];
  const difficulty = logs?.difficulty;

  const getClassImageSrc = (spec: string | undefined | null) => {
    if (!className || !spec) return null;
    return getClassIconSrc(className, spec);
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
          : "-"}
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
          : "-"}
      </Table.Td>
      <Table.Td
        c={ranking.totalKills ? undefined : "dimmed"}
        fw={ranking.totalKills ? 700 : undefined}
      >
        {ranking.totalKills?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }) || "-"}
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

  const numberOfSkeletons = rows.length > 0 ? rows.length : 5;
  const skeletonRows = Array.from({ length: numberOfSkeletons }).map(
    (_, idx) => (
      <Table.Tr key={idx}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Table.Td key={i}>
            <Skeleton height={25} miw={10} />
          </Table.Td>
        ))}
      </Table.Tr>
    ),
  );

  const setSearch = (partial: Partial<CharacterQueryParams>) => {
    navigate({
      to: ".",
      search: (prev) => ({
        roleType: partial.roleType ?? prev.roleType ?? RoleType.Any,
        metric: partial.metric ?? prev.metric ?? metric ?? undefined,
        difficulty:
          partial.difficulty ?? prev.difficulty ?? difficulty ?? undefined,
        bracket: partial.bracket ?? prev.bracket ?? false,
        raid: partial.raid ?? prev.raid ?? undefined, // Don't reset raid on other search changes
      }),
    });
  };

  return (
    <Stack w={"100%"} gap={0}>
      <Group justify="space-between" align="center" mb={0} wrap="wrap">
        <Title order={3}>Raid logs</Title>
        <Switch
          size="sm"
          onLabel="ON"
          offLabel="OFF"
          label={"By Ilvl"}
          labelPosition="left"
          checked={searchBracket}
          onChange={(event) => {
            return setSearch({ bracket: event.currentTarget.checked });
          }}
        />
      </Group>

      <Paper withBorder w="100%">
        <Grid gutter={"md"} p={"xs"}>
          <Grid.Col span={{ base: 12, sm: "auto" }}>
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
          <Grid.Col span={{ base: 12, sm: "auto" }}>
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
          <Grid.Col span={{ base: 12, sm: "content" }}>
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
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <Center>
          <Paper flex={1} radius={0}>
            <Group p={"xs"} w={"100%"} align={"center"} justify="space-around">
              <Stack gap={0} align="center">
                <Text m="0" fw={500} w={"fit-content"}>
                  Best average
                </Text>
                {isFetching ? (
                  <Skeleton height={25} miw={10} />
                ) : (
                  <Title
                    order={2}
                    m={0}
                    c={
                      logs?.bestPerformanceAverage
                        ? GetWarcraftLogRankingColors(
                          logs.bestPerformanceAverage,
                          theme,
                        )
                        : undefined
                    }
                    fw={700}
                  >
                    {logs?.bestPerformanceAverage || "-"}
                  </Title>
                )}
              </Stack>

              <Stack gap={0} align="center">
                <Text m="0" fw={500} w={"fit-content"}>
                  Median average
                </Text>
                {isFetching ? (
                  <Skeleton height={25} miw={10} />
                ) : (
                  <Title
                    order={2}
                    m={0}
                    c={
                      logs?.medianPerformanceAverage
                        ? GetWarcraftLogRankingColors(
                          logs.medianPerformanceAverage,
                          theme,
                        )
                        : undefined
                    }
                    fw={700}
                  >
                    {logs?.medianPerformanceAverage || "-"}
                  </Title>
                )}
              </Stack>
            </Group>
          </Paper>
        </Center>
        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing={0} horizontalSpacing={"md"}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Encounter</Table.Th>
                <Table.Th>Rank %</Table.Th>
                <Table.Th>Median %</Table.Th>
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
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
};
