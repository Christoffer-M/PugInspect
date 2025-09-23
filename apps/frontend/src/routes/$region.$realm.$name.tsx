import {
  Container,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Title,
} from "@mantine/core";
import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterSummaryQuery } from "../queries/character-summary";
import { IconReload } from "@tabler/icons-react";
import { Difficulty, Metric, RoleType } from "../graphql/graphql";
import { useCharacterLogs } from "../queries/character-logs";

type CharacterQueryParams = {
  roleType: RoleType;
  metric?: Metric;
  difficulty?: Difficulty;
};

export const Route = createFileRoute("/$region/$realm/$name")({
  component: CharacterPage,
  validateSearch: (search: Record<string, unknown>): CharacterQueryParams => ({
    roleType: (search.roleType as RoleType) || RoleType.Any,
    metric: search.metric as Metric | undefined,
    difficulty: search.difficulty as Difficulty | undefined,
  }),
});

function CharacterPage() {
  const { region, name, realm } = useParams({ from: Route.id });
  const {
    roleType: searchRoleType,
    metric: searchMetric,
    difficulty: searchDifficulty,
  } = useSearch({
    from: Route.id,
  });
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
  });

  const refetchData = () => {
    refetchSummary();
    refetchLogs();
  };

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center" gap={0}>
          <Group justify="space-between" w={"100%"} align="flex-start">
            <Title order={3}>Profile</Title>

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
          <Stack gap={"md"} w={"100%"} align="center">
            <CharacterHeader
              name={name}
              region={region}
              server={realm}
              data={characterSummaryData}
              loading={isFetchingSummary}
              isError={isError}
            />

            <LogsTable logs={logsData} isFetching={isFetchingLogs} />
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
}
