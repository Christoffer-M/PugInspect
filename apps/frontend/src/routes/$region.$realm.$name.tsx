import {
  Container,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterSummaryQuery } from "../queries/character-summary";
import { IconReload } from "@tabler/icons-react";
import { Metric, RoleType } from "../graphql/graphql";

type CharacterQueryParams = {
  roleType: RoleType;
  metric?: Metric;
};

export const Route = createFileRoute("/$region/$realm/$name")({
  component: CharacterPage,
  validateSearch: (search: Record<string, unknown>): CharacterQueryParams => ({
    roleType: (search.roleType as RoleType) || RoleType.Any,
    metric: search.metric as Metric | undefined,
  }),
});

function CharacterPage() {
  const { region, name, realm } = useParams({ from: Route.id });
  const {
    data,
    isFetching: isFetchingSummary,
    isError,
    dataUpdatedAt,
    refetch,
  } = useCharacterSummaryQuery({
    name: name,
    realm: realm,
    region: region,
  });

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center">
          <Group justify="flex-end" w={"100%"} align="flex-start" gap={"xs"}>
            <Text size="sm" c="dimmed" m={0}>
              {`Last updated:  ${data ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--:--"}`}
            </Text>
            <Tooltip label={"Refresh data"} withArrow openDelay={150}>
              <ActionIcon
                size={"md"}
                variant="outline"
                onClick={() => refetch()}
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
          <CharacterHeader
            name={name}
            region={region}
            server={realm}
            data={data}
            loading={isFetchingSummary}
            isError={isError}
          />

          <LogsTable />
        </Stack>
      </Container>
    </Page>
  );
}
