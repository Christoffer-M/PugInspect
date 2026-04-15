import {
  Container,
  Stack,
  Group,
  Title,
  Grid,
} from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterInfoQuery } from "../queries/character-info";
import { useCharacterRaiderIoQuery } from "../queries/character-raiderio";
import { Difficulty, Metric, RoleType } from "../graphql/graphql";
import { useCharacterLogs } from "../queries/character-logs";
import { RaidProgression } from "../components/RaidProgression";
import { BestMythicPlusRunsTable } from "../components/MythicPlusTables/BestMythicPlusRunsTable";
import { RecentMythicPlusRunsTable } from "../components/MythicPlusTables/RecentMythicPlusRunsTable";
import { getZoneIdForRaid, DEFAULT_RAID, RAIDS } from "../data/raidZones";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { ExternalLinkIcon } from "../components/ExternalLinkIcon";
import { normalizeRealm } from "../util/util";
import RaiderIoIcon from "../assets/raiderio-icon.svg";
import WarcraftLogsIcon from "../assets/warcraftlogs-icon.png";

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

  // Blizzard — character identity, cached 24 h
  const {
    data: characterInfo,
    isFetching: isFetchingInfo,
    isError,
  } = useCharacterInfoQuery({ name, realm, region });

  // RaiderIO — M+ runs, raid progression, season scores, cached 15 min
  const {
    data: raiderIoData,
    isFetching: isFetchingRaiderIo,
  } = useCharacterRaiderIoQuery({ name, realm, region });

  // WarcraftLogs — raid log performance, cached 15 min
  const {
    data: logsData,
    isFetching: isFetchingLogs,
  } = useCharacterLogs({
    name,
    realm,
    region,
    role: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    byBracket: searchBracket,
    zoneId: searchRaid ? getZoneIdForRaid(searchRaid) : RAIDS[DEFAULT_RAID]?.zoneId,
  });

  const { add: addToHistory } = useSearchHistory();
  useEffect(() => {
    if (!characterInfo) return;
    addToHistory({ name, realm, region, class: characterInfo.class ?? undefined });
  }, [characterInfo?.class, name, realm, region]);

  const handleRaidChange = (raid: string | null) => {
    navigate({ search: (prev) => ({ ...prev, raid: raid ?? undefined }) });
  };

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center" gap={0}>
          <Group justify="space-between" w="100%" align="flex-start">
            <Title order={2}>Profile</Title>
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
