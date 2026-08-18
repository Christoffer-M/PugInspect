import {
  Table,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Group,
  Anchor,
} from "@mantine/core";
import { Maybe, Metric } from "../../graphql/graphql";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { CharacterQueryParams } from "../../routes/$region.$realm.$name";
import { CharacterMythicPlusLogs } from "../../queries/character-mythicplus-logs";
import { useZonePartitions } from "../../queries/zone-partitions";
import {
  DEFAULT_MYTHIC_PLUS_SEASON,
  MYTHIC_PLUS_SEASONS,
} from "../../data/mythicPlusSeasons";
import { getRaidExpansion } from "../../data/raidZones";
import { SpecImage } from "../ui/SpecImage";
import { SkeletonTableRows } from "../ui/SkeletonTableRows";
import { PartitionSelector } from "./PartitionSelector";
import { PerformanceSummary } from "./PerformanceSummary";
import { ParsePill } from "../ui/ParsePill";
import { SectionTitle } from "../ui/SectionTitle";

const MP_METRICS = [
  { label: "DPS", value: Metric.PointsAndDamage },
  { label: "HPS", value: Metric.PointsAndHealing },
];

const DEFAULT_MP_METRIC = Metric.PointsAndDamage;

// Grouped by expansion, same shape as RAID_OPTIONS in RaidProgression
const SEASON_OPTIONS = (() => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  for (const [slug, season] of Object.entries(MYTHIC_PLUS_SEASONS)) {
    const group = getRaidExpansion(season.expansion) ?? "Other";
    (groups[group] ??= []).push({ value: slug, label: season.displayName });
  }
  return Object.entries(groups).map(([group, items]) => ({ group, items }));
})();

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatThroughput(value: number | null | undefined): string {
  // lowercase to keep the existing "1.2k" style over Intl's "1.2K"
  return value == null ? "–" : compactNumber.format(value).toLowerCase();
}

type MythicPlusLogsTableProps = {
  logs?: CharacterMythicPlusLogs | null;
  class?: Maybe<string> | undefined;
  isFetching: boolean;
  zoneId?: number;
};

export function MythicPlusLogsTable({
  logs,
  isFetching,
  class: className,
  zoneId,
}: MythicPlusLogsTableProps) {
  const {
    metric: searchMetric,
    partition: searchPartition,
    mpSeason: searchMpSeason,
  } = useSearch({ from: "/$region/$realm/$name" });
  const { region, realm, name } = useParams({ from: "/$region/$realm/$name" });

  const wclDungeonUrl = (dungeonId: number) =>
    `https://www.warcraftlogs.com/character/${region}/${realm}/${encodeURIComponent(name)}?boss=${dungeonId}${zoneId ? `&zone=${zoneId}` : ""}`;

  const { data: partitions } = useZonePartitions(zoneId);

  const metric = logs?.metric;
  const rankings = logs?.dungeonRankings ?? [];

  const activeMetric = MP_METRICS.some((m) => m.value === searchMetric)
    ? (searchMetric as Metric)
    : (metric ?? DEFAULT_MP_METRIC);

  const throughputLabel =
    activeMetric === Metric.PointsAndHealing ? "HPS" : "DPS";

  const navigate = useNavigate();

  const rows = rankings.map((ranking, i) => (
    <Table.Tr key={ranking.dungeon?.id ?? i}>
      <Table.Td c={ranking.throughputPercent != null ? undefined : "dimmed"}>
        {ranking.dungeon?.id ? (
          <Anchor
            size="sm"
            c="inherit"
            underline="hover"
            href={wclDungeonUrl(ranking.dungeon.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ranking.dungeon.name}
          </Anchor>
        ) : (
          ranking.dungeon?.name
        )}
      </Table.Td>
      <Table.Td>
        <ParsePill value={ranking.throughputPercent} />
      </Table.Td>
      <Table.Td>
        <ParsePill value={ranking.medianThroughputPercent} />
      </Table.Td>
      <Table.Td
        c={ranking.bestThroughput ? undefined : "dimmed"}
        fw={ranking.bestThroughput ? 600 : undefined}
      >
        {formatThroughput(ranking.bestThroughput)}
      </Table.Td>
      <Table.Td c={ranking.bestLevel ? undefined : "dimmed"}>
        {ranking.bestLevel ?? "–"}
      </Table.Td>
      <Table.Td c={ranking.totalRuns ? undefined : "dimmed"}>
        {ranking.totalRuns ?? "–"}
      </Table.Td>
      <Table.Td>
        {ranking.spec && className && (
          <SpecImage className={className} spec={ranking.spec} />
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const setSearch = (partial: Partial<CharacterQueryParams>) => {
    const hasPartitionUpdate = Object.prototype.hasOwnProperty.call(
      partial,
      "partition",
    );
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        metric: partial.metric ?? prev.metric ?? metric ?? DEFAULT_MP_METRIC,
        partition: hasPartitionUpdate
          ? partial.partition
          : (prev.partition ?? undefined),
        mpSeason:
          partial.mpSeason ?? prev.mpSeason ?? DEFAULT_MYTHIC_PLUS_SEASON,
      }),
      resetScroll: false,
    });
  };

  const partitionValue =
    searchPartition === "all" ? "all" : String(searchPartition ?? "all");

  return (
    <Stack w="100%" gap={0}>
      <SectionTitle
        order={3}
        right={
          <Group gap="xs">
            <Select
              w={180}
              allowDeselect={false}
              comboboxProps={{
                transitionProps: { transition: "pop", duration: 200 },
                width: "auto",
              }}
              data={SEASON_OPTIONS}
              value={searchMpSeason ?? DEFAULT_MYTHIC_PLUS_SEASON}
              onChange={(value) => {
                if (!value) return;
                setSearch({ mpSeason: value, partition: undefined });
              }}
            />
            <SegmentedControl
              data={MP_METRICS}
              value={activeMetric}
              onChange={(value) => {
                if (value == null) return;
                setSearch({ metric: value as Metric });
              }}
            />
            {partitions && (
              <PartitionSelector
                partitions={partitions}
                value={partitionValue}
                onChange={(value) =>
                  setSearch({
                    partition: value === "all" ? "all" : Number(value),
                  })
                }
              />
            )}
          </Group>
        }
        noWrap
      >
        Mythic+ logs
      </SectionTitle>

      <Paper withBorder w="100%">
        <PerformanceSummary
          metricLabel={throughputLabel}
          best={logs?.bestPerformanceAverage}
          median={logs?.medianPerformanceAverage}
          isFetching={isFetching}
        />

        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="xs" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dungeon</Table.Th>
                <Table.Th>Best {throughputLabel} %</Table.Th>
                <Table.Th>Median {throughputLabel} %</Table.Th>
                <Table.Th>Best {throughputLabel}</Table.Th>
                <Table.Th>Key</Table.Th>
                <Table.Th>Runs</Table.Th>
                <Table.Th>Spec</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isFetching ? (
                <SkeletonTableRows rows={rows.length || 8} columns={7} />
              ) : rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: "center" }}>
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
