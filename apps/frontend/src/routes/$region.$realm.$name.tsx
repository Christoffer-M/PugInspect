import { Container, Stack, Group, Grid, SegmentedControl } from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { CharacterHeader } from "../components/character/CharacterHeader";
import { RaidLogsTable } from "../components/logs/RaidLogsTable";
import { MythicPlusLogsTable } from "../components/logs/MythicPlusLogsTable";
import { Page } from "../components/layout/Page";
import { useCharacterInfoQuery } from "../queries/character-info";
import { useCharacterRaiderIoQuery } from "../queries/character-raiderio";
import { Difficulty, Metric, RoleType } from "../graphql/graphql";
import { useCharacterRaidLogs } from "../queries/character-raid-logs";
import { useCharacterMythicPlusLogs } from "../queries/character-mythicplus-logs";
import { useZonePartitions } from "../queries/zone-partitions";
import { RaidProgression } from "../components/logs/RaidProgression";
import { BestMythicPlusRunsTable } from "../components/mythic-plus/BestMythicPlusRunsTable";
import { RecentMythicPlusRunsTable } from "../components/mythic-plus/RecentMythicPlusRunsTable";
import { getZoneIdForRaid, DEFAULT_RAID, RAIDS } from "../data/raidZones";
import { DEFAULT_MYTHIC_PLUS_SEASON, getMythicPlusZoneId, MYTHIC_PLUS_SEASONS } from "../data/mythicPlusSeasons";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { ExternalLinkIcon } from "../components/ui/ExternalLinkIcon";
import { normalizeRealm } from "../util/util";
import RaiderIoIcon from "../assets/raiderio-icon.svg";
import WarcraftLogsIcon from "../assets/warcraftlogs-icon.png";

export type LogsView = "raid" | "mythicplus";

const MP_METRICS = new Set<Metric>([Metric.PointsAndDamage, Metric.PointsAndHealing]);

export type CharacterQueryParams = {
  roleType: RoleType;
  metric?: Metric;
  difficulty?: Difficulty;
  bracket?: boolean;
  raid?: string;
  partition?: number | "all";
  logsView?: LogsView;
  mpSeason?: string;
};

export const Route = createFileRoute("/$region/$realm/$name")({
  component: CharacterPage,
  validateSearch: (search: Record<string, unknown>): CharacterQueryParams => {
    const parsePartition = (value: unknown): CharacterQueryParams["partition"] => {
      if (value === "all") return "all";
      if (value == null) return undefined;

      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    return {
      roleType: (search.roleType as RoleType) || RoleType.Any,
      metric: search.metric as Metric | undefined,
      difficulty: search.difficulty as Difficulty | undefined,
      bracket: search.bracket === true || false,
      raid: search.raid as string | undefined,
      partition: search.partition !== undefined
        ? parsePartition(search.partition) ?? "all"
        : "all",
      logsView: (search.logsView === "mythicplus" ? "mythicplus"
        : search.logsView === "raid" ? "raid"
        : (localStorage.getItem("logsView") as LogsView | null) ?? "raid") as LogsView,
      mpSeason: (search.mpSeason as string | undefined) ?? DEFAULT_MYTHIC_PLUS_SEASON,
    };
  },
});

function CharacterPage() {
  const { region, name, realm } = useParams({ from: Route.id });

  useEffect(() => {
    document.title = `${name}-${realm} | PugInspect`;
  }, [name, realm]);

  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    bracket: searchBracket,
    raid: searchRaid,
    partition: searchPartition,
    logsView: searchLogsView,
    mpSeason: searchMpSeason,
  } = useSearch({ from: Route.id });

  const navigate = useNavigate({ from: Route.id });

  const isMythicPlusView = searchLogsView === "mythicplus";

  // Blizzard — character identity, cached 24 h
  const {
    data: characterInfo,
    isFetching: isFetchingInfo,
    isError,
  } = useCharacterInfoQuery({ name, realm, region });

  // RaiderIO — M+ runs, raid progression, season scores, cached 15 min
  const { data: raiderIoData, isFetching: isFetchingRaiderIo } =
    useCharacterRaiderIoQuery({ name, realm, region });

  // Raid logs setup
  const raidZoneId = searchRaid
    ? getZoneIdForRaid(searchRaid)
    : RAIDS[DEFAULT_RAID]?.zoneId;
  const { data: raidPartitions } = useZonePartitions(raidZoneId);
  const effectiveRaidPartition =
    raidPartitions?.length === 1
      ? undefined
      : searchPartition === "all"
        ? undefined
        : searchPartition;

  const { data: raidLogsData, isFetching: isFetchingRaidLogs } = useCharacterRaidLogs({
    name,
    realm,
    region,
    role: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    byBracket: searchBracket,
    zoneId: raidZoneId,
    partition: effectiveRaidPartition,
    enabled: !isMythicPlusView,
  });

  // Mythic+ logs setup
  const mpSeasonSlug = searchMpSeason ?? DEFAULT_MYTHIC_PLUS_SEASON;
  const mpZoneId = getMythicPlusZoneId(mpSeasonSlug) ?? MYTHIC_PLUS_SEASONS[DEFAULT_MYTHIC_PLUS_SEASON]!.zoneId;
  const { data: mpPartitions } = useZonePartitions(mpZoneId);
  const effectiveMpPartition =
    mpPartitions?.length === 1
      ? undefined
      : searchPartition === "all"
        ? undefined
        : searchPartition;

  const effectiveMpMetric = MP_METRICS.has(searchMetric as Metric)
    ? (searchMetric as Metric)
    : Metric.PointsAndDamage;

  const { data: mpLogsData, isFetching: isFetchingMpLogs } = useCharacterMythicPlusLogs({
    name,
    realm,
    region,
    metric: effectiveMpMetric,
    zoneId: mpZoneId,
    partition: effectiveMpPartition,
    enabled: isMythicPlusView,
  });

  const { add: addToHistory } = useSearchHistory();
  useEffect(() => {
    if (!characterInfo) return;
    addToHistory({
      name,
      realm,
      region,
      class: characterInfo.class ?? undefined,
    });
  }, [characterInfo?.class, name, realm, region]);

  const handleRaidChange = (raid: string | null) => {
    navigate({
      search: (prev) => ({
        ...prev,
        raid: raid ?? undefined,
        partition: undefined,
      }),
    });
  };

  return (
    <Page>
      <Container>
        <Stack mt="md" gap="lg">
          <Group justify="flex-end" w="100%">
            <Group gap="xs">
              <ExternalLinkIcon
                href={`https://raider.io/characters/${region}/${normalizeRealm(realm)}/${name}`}
                icon={RaiderIoIcon}
                label="View on Raider.IO"
                size={28}
              />
              <ExternalLinkIcon
                href={`https://www.warcraftlogs.com/character/${region}/${normalizeRealm(realm)}/${name}`}
                icon={WarcraftLogsIcon}
                label="View on WarcraftLogs"
                size={28}
              />
            </Group>
          </Group>

          <Stack gap="lg" w="100%">
            <CharacterHeader
              name={name}
              characterInfo={characterInfo}
              raiderIo={raiderIoData}
              isLoadingInfo={isFetchingInfo}
              isLoadingRaiderIo={isFetchingRaiderIo}
              isError={isError}
            />
            <Stack w="100%" gap="xs">
              <SegmentedControl
                data={[
                  { label: "Raid", value: "raid" },
                  { label: "Mythic+", value: "mythicplus" },
                ]}
                value={searchLogsView ?? "raid"}
                onChange={(value) => {
                  const view = value as LogsView;
                  localStorage.setItem("logsView", view);
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      logsView: view,
                      metric: undefined,
                      partition: undefined,
                      ...(view === "mythicplus" && { difficulty: undefined, bracket: undefined }),
                    }),
                  });
                }}
              />
              {!isMythicPlusView && (
                <RaidProgression
                  raidData={raiderIoData?.raidProgression ?? []}
                  isLoading={isFetchingRaiderIo}
                  selectedRaid={searchRaid ?? DEFAULT_RAID ?? null}
                  onRaidChange={handleRaidChange}
                />
              )}
              {isMythicPlusView ? (
                <MythicPlusLogsTable
                  logs={mpLogsData}
                  isFetching={isFetchingMpLogs}
                  class={characterInfo?.class}
                  zoneId={mpZoneId}
                />
              ) : (
                <RaidLogsTable
                  logs={raidLogsData}
                  isFetching={isFetchingRaidLogs}
                  class={characterInfo?.class}
                  zoneId={raidZoneId}
                />
              )}
            </Stack>
            <Grid w="100%">
              <Grid.Col span={{ sm: 12, md: 6 }}>
                <BestMythicPlusRunsTable
                  isFetching={isFetchingRaiderIo}
                  characterRuns={raiderIoData?.bestMythicPlusRuns ?? []}
                />
              </Grid.Col>
              <Grid.Col span={{ sm: 12, md: 6 }}>
                <RecentMythicPlusRunsTable
                  isFetching={isFetchingRaiderIo}
                  characterRuns={raiderIoData?.recentMythicPlusRuns ?? []}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
}
