import {
  Table,
  Paper,
  Title,
  SegmentedControl,
  Stack,
  Text,
  Grid,
  Group,
  Center,
  Switch,
} from "@mantine/core";
import { useMantineTheme } from "@mantine/core";
import { GetWarcraftLogRankingColors, formatPercent } from "../../util/util";
import { Difficulty, Maybe, Metric, RoleType } from "../../graphql/graphql";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CharacterQueryParams } from "../../routes/$region.$realm.$name";
import { CharacterRaidLogs } from "../../queries/character-raid-logs";
import { useZonePartitions } from "../../queries/zone-partitions";
import { SpecImage } from "../ui/SpecImage";
import { SkeletonTableRows } from "../ui/SkeletonTableRows";
import { PartitionSelector } from "./PartitionSelector";
import { PerformanceSummary } from "./PerformanceSummary";

const DIFFICULTY_ORDER = ["LFR", "Normal", "Heroic", "Mythic"];
const RAID_METRICS = [Metric.Dps, Metric.Hps];
const DEFAULT_RAID_METRIC = Metric.Dps;

type RaidLogsTableProps = {
  logs?: CharacterRaidLogs | null;
  class?: Maybe<string> | undefined;
  isFetching: boolean;
  zoneId?: number;
};

export function RaidLogsTable({
  logs,
  isFetching,
  class: className,
  zoneId,
}: RaidLogsTableProps) {
  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    bracket: searchBracket,
    partition: searchPartition,
  } = useSearch({ from: "/$region/$realm/$name" });

  const { data: partitions } = useZonePartitions(zoneId);

  const metric = logs?.metric;
  const rankings = logs?.raidRankings ?? [];
  const difficulty = logs?.difficulty;

  const activeMetric = RAID_METRICS.includes(searchMetric as Metric)
    ? (searchMetric as Metric)
    : (metric ?? DEFAULT_RAID_METRIC);

  const navigate = useNavigate();
  const theme = useMantineTheme();

  const rows = rankings.map((ranking, i) => (
    <Table.Tr key={ranking.encounter?.id ?? i}>
      <Table.Td c={ranking.medianPercent ? undefined : "dimmed"}>
        {ranking.encounter?.name}
      </Table.Td>
      <Table.Td
        c={ranking.rankPercent ? GetWarcraftLogRankingColors(ranking.rankPercent, theme) : "dimmed"}
        fw={ranking.rankPercent ? 700 : undefined}
      >
        {formatPercent(ranking.rankPercent)}
      </Table.Td>
      <Table.Td
        c={ranking.medianPercent ? GetWarcraftLogRankingColors(ranking.medianPercent, theme) : "dimmed"}
        fw={ranking.medianPercent ? 700 : undefined}
      >
        {formatPercent(ranking.medianPercent)}
      </Table.Td>
      <Table.Td c={ranking.totalKills ? undefined : "dimmed"} fw={ranking.totalKills ? 700 : undefined}>
        {ranking.totalKills?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "-"}
      </Table.Td>
      <Table.Td c={ranking.bestRank?.ilvl ? undefined : "dimmed"}>
        {ranking.bestRank?.ilvl ?? "-"}
      </Table.Td>
      <Table.Td>
        {ranking.spec && className && (
          <SpecImage className={className} spec={ranking.spec} />
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const setSearch = (partial: Partial<CharacterQueryParams>) => {
    const hasPartitionUpdate = Object.prototype.hasOwnProperty.call(partial, "partition");
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        roleType: partial.roleType ?? prev.roleType ?? RoleType.Any,
        metric: partial.metric ?? (RAID_METRICS.includes(prev.metric as Metric) ? prev.metric : undefined) ?? metric ?? undefined,
        difficulty: partial.difficulty ?? prev.difficulty ?? difficulty ?? undefined,
        bracket: partial.bracket ?? prev.bracket ?? false,
        raid: partial.raid ?? prev.raid ?? undefined,
        partition: hasPartitionUpdate ? partial.partition : (prev.partition ?? undefined),
      }),
    });
  };

  const partitionValue = searchPartition === "all" ? "all" : String(searchPartition ?? "all");

  return (
    <Stack w="100%" gap={0}>
      <Group justify="space-between" align="center" mb={0} wrap="wrap">
        <Title order={3}>Raid logs</Title>
        <Group gap="md">
          {partitions && (
            <PartitionSelector
              partitions={partitions}
              value={partitionValue}
              onChange={(value) =>
                setSearch({ partition: value === "all" ? "all" : Number(value) })
              }
            />
          )}
          <Switch
            size="sm"
            onLabel="ON"
            offLabel="OFF"
            label="By Ilvl"
            labelPosition="left"
            checked={searchBracket}
            onChange={(event) => setSearch({ bracket: event.currentTarget.checked })}
          />
        </Group>
      </Group>

      <Paper withBorder w="100%">
        <Grid gutter="md" p="xs">
          <Grid.Col span={{ base: 12, sm: "auto" }}>
            <Stack align="center" w="100%" gap="xs" flex={1}>
              <Text m="0" fw={500} w="fit-content">Difficulty</Text>
              <SegmentedControl
                w="100%"
                data={DIFFICULTY_ORDER.map((d) => ({ label: d, value: d }))}
                value={searchDifficulty ?? difficulty ?? DIFFICULTY_ORDER[0]}
                onChange={(value) => {
                  if (value == null) return;
                  setSearch({ difficulty: value as Difficulty });
                }}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: "auto" }}>
            <Stack align="center" w="100%" gap="xs" flex={1}>
              <Text m="0" fw={500} w="fit-content">Role</Text>
              <SegmentedControl
                w="100%"
                data={Object.values(RoleType).map((role) => ({ label: role, value: role }))}
                value={searchRoleType}
                onChange={(value) => {
                  if (value == null) return;
                  setSearch({ roleType: value as RoleType });
                }}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: "content" }}>
            <Stack align="center" w="100%" gap="xs" flex={1}>
              <Text m="0" fw={500} w="fit-content">Metric</Text>
              <SegmentedControl
                w="100%"
                data={RAID_METRICS.map((m) => ({ label: m.toUpperCase(), value: m }))}
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
          <PerformanceSummary
            metricLabel={activeMetric.toUpperCase()}
            best={logs?.bestPerformanceAverage}
            median={logs?.medianPerformanceAverage}
            isFetching={isFetching}
          />
        </Center>

        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing={0} horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Encounter</Table.Th>
                <Table.Th>Rank %</Table.Th>
                <Table.Th>Median %</Table.Th>
                <Table.Th>Kills</Table.Th>
                <Table.Th>Ilvl</Table.Th>
                <Table.Th>Spec</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isFetching ? (
                <SkeletonTableRows rows={rows.length || 5} columns={6} />
              ) : rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: "center" }}>
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
}
