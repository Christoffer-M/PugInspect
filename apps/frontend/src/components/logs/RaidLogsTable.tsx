import {
  Table,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Grid,
  Switch,
  Group,
  Box,
} from "@mantine/core";
import { Difficulty, Maybe, Metric, RoleType } from "../../graphql/graphql";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CharacterQueryParams } from "../../routes/$region.$realm.$name";
import { CharacterRaidLogs } from "../../queries/character-raid-logs";
import { useZonePartitions } from "../../queries/zone-partitions";
import { SpecImage } from "../ui/SpecImage";
import { SkeletonTableRows } from "../ui/SkeletonTableRows";
import { PartitionSelector } from "./PartitionSelector";
import { PerformanceSummary } from "./PerformanceSummary";
import { ParsePill } from "../ui/ParsePill";
import { SectionTitle } from "../ui/SectionTitle";

const DIFFICULTY_ORDER = ["LFR", "Normal", "Heroic", "Mythic"];
const RAID_METRICS = [Metric.Dps, Metric.Hps];
const DEFAULT_RAID_METRIC = Metric.Dps;

type RaidLogsTableProps = {
  logs?: CharacterRaidLogs | null;
  class?: Maybe<string> | undefined;
  isFetching: boolean;
  zoneId?: number;
};

export function RaidLogsTable({ logs, isFetching, class: className, zoneId }: RaidLogsTableProps) {
  const { roleType: searchRoleType, metric: searchMetric, difficulty: searchDifficulty, bracket: searchBracket, partition: searchPartition } =
    useSearch({ from: "/$region/$realm/$name" });

  const { data: partitions } = useZonePartitions(zoneId);

  const metric = logs?.metric;
  const rankings = logs?.raidRankings ?? [];
  const difficulty = logs?.difficulty;

  const activeMetric = RAID_METRICS.includes(searchMetric as Metric)
    ? (searchMetric as Metric)
    : (metric ?? DEFAULT_RAID_METRIC);

  const navigate = useNavigate();

  const rows = rankings.map((ranking, i) => (
    <Table.Tr key={ranking.encounter?.id ?? i}>
      <Table.Td c={ranking.medianPercent ? undefined : "dimmed"}>
        <Group gap="xs" wrap="nowrap" align="center">
          {ranking.encounter?.id && (
            <Box style={{
              width: 26, height: 26, flexShrink: 0,
              borderRadius: "var(--mantine-radius-md)",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}>
              <img
                src={`https://assets.rpglogs.com/img/warcraft/bosses/${ranking.encounter.id}-icon.jpg`}
                alt={ranking.encounter.name ?? ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </Box>
          )}
          <Text size="sm" m={0}>{ranking.encounter?.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td><ParsePill value={ranking.rankPercent} /></Table.Td>
      <Table.Td><ParsePill value={ranking.medianPercent} /></Table.Td>
      <Table.Td c={ranking.totalKills ? undefined : "dimmed"} fw={ranking.totalKills ? 600 : undefined}>
        {ranking.totalKills?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "–"}
      </Table.Td>
      <Table.Td c={ranking.bestRank?.ilvl ? undefined : "dimmed"}>
        {ranking.bestRank?.ilvl ?? "–"}
      </Table.Td>
      <Table.Td>
        {ranking.spec && className && <SpecImage className={className} spec={ranking.spec} />}
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
      <SectionTitle
        order={3}
        right={
          <Grid gutter="xs" align="center">
            {partitions && (
              <Grid.Col span="content">
                <PartitionSelector
                  partitions={partitions}
                  value={partitionValue}
                  onChange={(value) => setSearch({ partition: value === "all" ? "all" : Number(value) })}
                />
              </Grid.Col>
            )}
            <Grid.Col span="content">
              <Switch
                size="sm"
                onLabel="ON"
                offLabel="OFF"
                label="By Ilvl"
                labelPosition="left"
                checked={searchBracket}
                onChange={(event) => setSearch({ bracket: event.currentTarget.checked })}
              />
            </Grid.Col>
          </Grid>
        }
        noWrap
      >
        Raid logs
      </SectionTitle>

      <Paper withBorder w="100%">
        <Grid gutter="md" p="xs">
          <Grid.Col span={{ base: 12, sm: "auto" }}>
            <Stack align="center" w="100%" gap={4} flex={1}>
              <Text m="0" fw={500} size="xs" tt="uppercase" c="dimmed">Difficulty</Text>
              <SegmentedControl
                w="100%"
                size="xs"
                data={DIFFICULTY_ORDER.map((d) => ({ label: d, value: d }))}
                value={searchDifficulty ?? difficulty ?? DIFFICULTY_ORDER[0]}
                onChange={(value) => { if (value == null) return; setSearch({ difficulty: value as Difficulty }); }}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: "auto" }}>
            <Stack align="center" w="100%" gap={4} flex={1}>
              <Text m="0" fw={500} size="xs" tt="uppercase" c="dimmed">Role</Text>
              <SegmentedControl
                w="100%"
                size="xs"
                data={Object.values(RoleType).map((role) => ({ label: role, value: role }))}
                value={searchRoleType}
                onChange={(value) => { if (value == null) return; setSearch({ roleType: value as RoleType }); }}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: "content" }}>
            <Stack align="center" w="100%" gap={4} flex={1}>
              <Text m="0" fw={500} size="xs" tt="uppercase" c="dimmed">Metric</Text>
              <SegmentedControl
                w="100%"
                size="xs"
                data={RAID_METRICS.map((m) => ({ label: m.toUpperCase(), value: m }))}
                value={activeMetric}
                onChange={(value) => { if (value == null) return; setSearch({ metric: value as Metric }); }}
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <PerformanceSummary
          metricLabel={activeMetric.toUpperCase()}
          best={logs?.bestPerformanceAverage}
          median={logs?.medianPerformanceAverage}
          isFetching={isFetching}
        />

        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing="xs" horizontalSpacing="md">
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
                  <Table.Td colSpan={6} style={{ textAlign: "center" }}>No logs available.</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
}
