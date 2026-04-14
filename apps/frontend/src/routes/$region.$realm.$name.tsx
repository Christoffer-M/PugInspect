import {
  Container,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Title,
  Grid,
} from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterInfoQuery } from "../queries/character-info";
import { useCharacterRaiderIoQuery } from "../queries/character-raiderio";
import { IconReload } from "@tabler/icons-react";
import { Difficulty, Metric, RoleType } from "../graphql/graphql";
import { useCharacterLogs } from "../queries/character-logs";
import { RaidProgression } from "../components/RaidProgression";
import { BestMythicPlusRunsTable } from "../components/MythicPlusTables/BestMythicPlusRunsTable";
import { RecentMythicPlusRunsTable } from "../components/MythicPlusTables/RecentMythicPlusRunsTable";
import { getZoneIdForRaid, DEFAULT_RAID, RAIDS } from "../data/raidZones";
import { useSearchHistory } from "../hooks/useSearchHistory";

export type CharacterQueryParams = {
  roleType: RoleType;
  metric?: Metric;
  difficulty?: Difficulty;
  bracket?: boolean;
  raid?: string;
};

export const Route = createFileRoute("/$region/$realm/$name")({
  component: CharacterPage,
  validateSearch: (search: Record<string, unknown>): CharacterQueryParams => ({
    roleType: (search.roleType as RoleType) || RoleType.Any,
    metric: search.metric as Metric | undefined,
    difficulty: search.difficulty as Difficulty | undefined,
    bracket: search.bracket === true || false,
    raid: search.raid as string | undefined,
  }),
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
  } = useSearch({ from: Route.id });

  const navigate = useNavigate({ from: Route.id });
  const bypassCacheRef = useRef(false);

  // Blizzard — character identity, cached 24 h
  const {
    data: characterInfo,
    isFetching: isFetchingInfo,
    isError,
    refetch: refetchInfo,
  } = useCharacterInfoQuery({ name, realm, region, bypassCacheRef });

  // RaiderIO — M+ runs, raid progression, season scores, cached 15 min
  const {
    data: raiderIoData,
    isFetching: isFetchingRaiderIo,
    refetch: refetchRaiderIo,
  } = useCharacterRaiderIoQuery({ name, realm, region, bypassCacheRef });

  // WarcraftLogs — raid log performance, cached 15 min
  const {
    data: logsData,
    isFetching: isFetchingLogs,
    refetch: refetchLogs,
  } = useCharacterLogs({
    name,
    realm,
    region,
    role: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    byBracket: searchBracket,
    zoneId: searchRaid ? getZoneIdForRaid(searchRaid) : RAIDS[DEFAULT_RAID]?.zoneId,
    bypassCacheRef,
  });

  const { add: addToHistory } = useSearchHistory();
  useEffect(() => {
    if (!characterInfo) return;
    addToHistory({ name, realm, region, class: characterInfo.class ?? undefined });
  }, [characterInfo?.class, name, realm, region]);

  const refetchData = async () => {
    bypassCacheRef.current = true;
    try {
      await Promise.all([refetchInfo(), refetchRaiderIo(), refetchLogs()]);
    } finally {
      bypassCacheRef.current = false;
    }
  };

  const handleRaidChange = (raid: string | null) => {
    navigate({ search: (prev) => ({ ...prev, raid: raid ?? undefined }) });
  };

  const fetchedAt = characterInfo?.fetchedAt
    ? new Date(characterInfo.fetchedAt).toLocaleTimeString()
    : undefined;

  // Base refresh throttle on RaiderIO data — it's the most time-sensitive source (15 min cache)
  const disableRefresh = characterInfo?.fetchedAt
    ? new Date().getTime() - new Date(characterInfo.fetchedAt).getTime() < 5 * 60 * 1000
    : false;

  const isFetchingAny = isFetchingInfo || isFetchingRaiderIo;

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center" gap={0}>
          <Group justify="space-between" w="100%" align="flex-start">
            <Title order={2}>Profile</Title>
            <Group>
              <Text size="sm" c="dimmed" m={0}>
                {`Last updated:  ${fetchedAt ?? "--:--:--"}`}
              </Text>
              <Tooltip
                label={
                  disableRefresh
                    ? "Data is fresh, refresh disabled until 5 minutes have passed"
                    : "Refresh data"
                }
                withArrow
                openDelay={150}
              >
                <ActionIcon
                  size="md"
                  variant="outline"
                  onClick={refetchData}
                  loaderProps={{ size: "xs", type: "dots" }}
                  disabled={disableRefresh && !isFetchingAny}
                  loading={isFetchingAny}
                >
                  <IconReload size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Stack gap="lg" w="100%" align="center">
            <CharacterHeader
              name={name}
              region={region}
              server={realm}
              characterInfo={characterInfo}
              raiderIo={raiderIoData}
              isLoadingInfo={isFetchingInfo}
              isLoadingRaiderIo={isFetchingRaiderIo}
              isError={isError}
            />
            <RaidProgression
              raidData={raiderIoData?.raidProgression ?? []}
              isLoading={isFetchingRaiderIo}
              selectedRaid={searchRaid ?? DEFAULT_RAID ?? null}
              onRaidChange={handleRaidChange}
            />
            <LogsTable
              logs={logsData}
              isFetching={isFetchingLogs}
              class={characterInfo?.class}
            />
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
