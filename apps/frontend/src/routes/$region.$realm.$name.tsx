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
import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterSummaryQuery } from "../queries/character-summary";
import { IconReload } from "@tabler/icons-react";
import { Difficulty, Metric, RoleType } from "../graphql/graphql";
import { useCharacterLogs } from "../queries/character-logs";
import { RaidProgression } from "../components/RaidProgression";
import { BestMythicPlusRunsTable } from "../components/MythicPlusTables/BestMythicPlusRunsTable";
import { RecentMythicPlusRunsTable } from "../components/MythicPlusTables/RecentMythicPlusRunsTable";
import { getZoneIdForRaid } from "../data/raidZones";
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
  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
    bracket: searchBracket,
    raid: searchRaid,
  } = useSearch({
    from: Route.id,
  });

  const navigate = useNavigate({ from: Route.id });

  const {
    data: characterSummaryData,
    isFetching: isFetchingSummary,
    isError,
    dataUpdatedAt,
    refetch: refetchSummary,
  } = useCharacterSummaryQuery({
    name,
    realm,
    region,
  });

  const raidProgression = characterSummaryData?.raiderIo?.raidProgression ?? [];
  const effectiveRaid = searchRaid ?? raidProgression[0]?.raid ?? null;

  const { add: addToHistory } = useSearchHistory();
  useEffect(() => {
    if (!characterSummaryData?.raiderIo) return;
    addToHistory({
      name,
      realm,
      region,
      class: characterSummaryData.raiderIo.class ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterSummaryData?.raiderIo?.class]);

  const {
    data: logsData,
    isFetching: isFetchingLogs,
    refetch: refetchLogs,
  } = useCharacterLogs(
    {
      name,
      realm,
      region,
      role: searchRoleType,
      metric: searchMetric,
      difficulty: searchDifficulty,
      byBracket: searchBracket,
      // Only include the raid slug if it's explicitly set in the search params, otherwise let the API default to the most recent raid
      zoneId: searchRaid ? getZoneIdForRaid(searchRaid) : undefined,
    }
  );

  const refetchData = () => {
    refetchSummary();
    refetchLogs();
  };

  const handleRaidChange = (raid: string | null) => {
    navigate({ search: (prev) => ({ ...prev, raid: raid ?? undefined }) });
  };

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center" gap={0}>
          <Group justify="space-between" w={"100%"} align="flex-start">
            <Title order={2}>Profile</Title>

            <Group>
              <Text size="sm" c="dimmed" m={0}>
                {`Last updated:  ${characterSummaryData ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--:--"}`}
              </Text>
              <Tooltip label={"Refresh data"} withArrow openDelay={150}>
                <ActionIcon
                  size={"md"}
                  variant="outline"
                  onClick={() => refetchData()}
                  loaderProps={{
                    size: "xs",
                    type: "dots",
                  }}
                  loading={isFetchingSummary}
                >
                  <IconReload size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Stack gap={"lg"} w={"100%"} align="center">
            <CharacterHeader
              name={name}
              region={region}
              server={realm}
              data={characterSummaryData}
              loading={isFetchingSummary}
              isError={isError}
            />
            <RaidProgression
              raidData={raidProgression}
              isLoading={isFetchingSummary}
              selectedRaid={effectiveRaid}
              onRaidChange={handleRaidChange}
            />
            <LogsTable
              logs={logsData}
              isFetching={isFetchingLogs}
              class={characterSummaryData?.raiderIo?.class}
            />
            <Grid w={"100%"}>
              <Grid.Col span={{ sm: 12, md: 6 }}>
                <BestMythicPlusRunsTable
                  isFetching={isFetchingSummary}
                  characterRuns={
                    characterSummaryData?.raiderIo?.bestMythicPlusRuns ?? []
                  }
                />
              </Grid.Col>

              <Grid.Col span={{ sm: 12, md: 6 }}>
                <RecentMythicPlusRunsTable
                  isFetching={isFetchingSummary}
                  characterRuns={
                    characterSummaryData?.raiderIo?.recentMythicPlusRuns ?? []
                  }
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
}
