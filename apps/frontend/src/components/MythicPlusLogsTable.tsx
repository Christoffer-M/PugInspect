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
} from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import { getClassIconSrc } from "../assets/classIcons";
import { Maybe, Metric } from "../graphql/graphql";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CharacterQueryParams } from "../routes/$region.$realm.$name";
import { CharacterMythicPlusLogs } from "../queries/character-mythicplus-logs";
import { useZonePartitions } from "../queries/zone-partitions";

const MP_METRICS = [
  { label: "Score + DPS", value: Metric.PointsAndDamage },
  { label: "Score + HPS", value: Metric.PointsAndHealing },
];

const DEFAULT_MP_METRIC = Metric.PointsAndDamage;

function formatThroughput(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${(value / 1000).toFixed(1)}k`;
}

type MythicPlusLogsTableProps = {
  logs?: CharacterMythicPlusLogs | null;
  class?: Maybe<string> | undefined;
  isFetching: boolean;
  zoneId?: number;
};

export const MythicPlusLogsTable: React.FC<MythicPlusLogsTableProps> = ({
  logs,
  isFetching,
  class: className,
  zoneId,
}) => {
  const {
    metric: searchMetric,
    partition: searchPartition,
  } = useSearch({
    from: "/$region/$realm/$name",
  });

  const { data: partitions } = useZonePartitions(zoneId);

  const metric = logs?.metric;
  const rankings = logs?.dungeonRankings || [];

  const activeMetric = MP_METRICS.some((m) => m.value === searchMetric)
    ? (searchMetric as Metric)
    : (metric ?? DEFAULT_MP_METRIC);

  const throughputLabel = activeMetric === Metric.PointsAndHealing ? "HPS" : "DPS";

  const getClassImageSrc = (spec: string | undefined | null) => {
    if (!className || !spec) return null;
    return getClassIconSrc(className, spec);
  };

  const navigate = useNavigate();
  const theme = useMantineTheme();

  const rows = rankings?.map((ranking) => (
    <Table.Tr key={ranking.dungeon?.id ?? Math.random()}>
      <Table.Td c={ranking.rankPercent ? undefined : "dimmed"}>
        {ranking.dungeon?.name}
      </Table.Td>
      <Table.Td
        c={ranking.rankPercent ? GetWarcraftLogRankingColors(ranking.rankPercent, theme) : "dimmed"}
        fw={ranking.rankPercent ? 700 : undefined}
      >
        {ranking.rankPercent != null
          ? Math.floor(ranking.rankPercent).toLocaleString(undefined, { maximumFractionDigits: 0 })
          : "-"}
      </Table.Td>
      <Table.Td c={ranking.bestScore ? undefined : "dimmed"} fw={ranking.bestScore ? 700 : undefined}>
        {ranking.bestScore?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "-"}
      </Table.Td>
      <Table.Td
        c={ranking.throughputPercent != null ? GetWarcraftLogRankingColors(ranking.throughputPercent, theme) : "dimmed"}
        fw={ranking.throughputPercent != null ? 700 : undefined}
      >
        {ranking.throughputPercent != null
          ? Math.floor(ranking.throughputPercent).toLocaleString(undefined, { maximumFractionDigits: 0 })
          : "-"}
      </Table.Td>
      <Table.Td c={ranking.bestThroughput ? undefined : "dimmed"} fw={ranking.bestThroughput ? 700 : undefined}>
        {formatThroughput(ranking.bestThroughput)}
      </Table.Td>
      <Table.Td c={ranking.bestLevel ? undefined : "dimmed"}>
        {ranking.bestLevel ?? "-"}
      </Table.Td>
      <Table.Td c={ranking.totalRuns ? undefined : "dimmed"}>
        {ranking.totalRuns ?? "-"}
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

  const numberOfSkeletons = rows.length > 0 ? rows.length : 8;
  const skeletonRows = Array.from({ length: numberOfSkeletons }).map((_, idx) => (
    <Table.Tr key={idx}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Table.Td key={i}>
          <Skeleton height={25} miw={10} />
        </Table.Td>
      ))}
    </Table.Tr>
  ));

  const setSearch = (partial: Partial<CharacterQueryParams>) => {
    const hasPartitionUpdate = Object.prototype.hasOwnProperty.call(partial, "partition");
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        metric: partial.metric ?? prev.metric ?? metric ?? DEFAULT_MP_METRIC,
        partition: hasPartitionUpdate ? partial.partition : (prev.partition ?? undefined),
      }),
    });
  };

  return (
    <Stack w={"100%"} gap={0}>
      <Group justify="space-between" align="center" mb={0} wrap="wrap">
        <Title order={3}>Mythic+ logs</Title>
        {partitions && partitions.length > 1 && (
          <SegmentedControl
            size="xs"
            data={[
              { label: "All", value: "all" },
              ...partitions.map((p) => ({
                label: p.compactName,
                value: String(p.id),
              })),
            ]}
            value={searchPartition === "all" ? "all" : String(searchPartition ?? "all")}
            onChange={(value) => {
              if (value == null) return;
              setSearch({ partition: value === "all" ? "all" : Number(value) });
            }}
          />
        )}
      </Group>

      <Paper withBorder w="100%">
        <Grid gutter={"md"} p={"xs"}>
          <Grid.Col span={{ base: 12, sm: "content" }}>
            <Stack align="center" w={"100%"} gap={"xs"} flex={1}>
              <Text m="0" fw={500} w={"fit-content"}>Metric</Text>
              <SegmentedControl
                w={"100%"}
                data={MP_METRICS}
                value={activeMetric}
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
                <Text m="0" fw={500} w={"fit-content"}>Best {throughputLabel} average</Text>
                {isFetching ? (
                  <Skeleton height={25} miw={10} />
                ) : (
                  <Title
                    order={2}
                    m={0}
                    c={logs?.bestPerformanceAverage
                      ? GetWarcraftLogRankingColors(logs.bestPerformanceAverage, theme)
                      : undefined}
                    fw={700}
                  >
                    {logs?.bestPerformanceAverage || "-"}
                  </Title>
                )}
              </Stack>
              <Stack gap={0} align="center">
                <Text m="0" fw={500} w={"fit-content"}>Median {throughputLabel} average</Text>
                {isFetching ? (
                  <Skeleton height={25} miw={10} />
                ) : (
                  <Title
                    order={2}
                    m={0}
                    c={logs?.medianPerformanceAverage
                      ? GetWarcraftLogRankingColors(logs.medianPerformanceAverage, theme)
                      : undefined}
                    fw={700}
                  >
                    {logs?.medianPerformanceAverage || "-"}
                  </Title>
                )}
              </Stack>
            </Group>
          </Paper>
        </Center>

        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing={0} horizontalSpacing={"md"}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dungeon</Table.Th>
                <Table.Th>Score %</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th>{throughputLabel} %</Table.Th>
                <Table.Th>Best {throughputLabel}</Table.Th>
                <Table.Th>Key</Table.Th>
                <Table.Th>Runs</Table.Th>
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
                  <Table.Td colSpan={8} style={{ textAlign: "center" }}>
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
