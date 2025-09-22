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
import { useCharacterQuery } from "../queries/character-queries";
import { IconReload } from "@tabler/icons-react";

export const Route = createFileRoute("/$region/$realm/$name")({
  component: RouteComponent,
});

function RouteComponent() {
  const { region, name, realm } = useParams({ from: Route.id });
  const { data, isFetching, isError, dataUpdatedAt, refetch } =
    useCharacterQuery({
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
                loaderProps={{ size: "xs", type: "dots" }}
                loading={isFetching}
              >
                <IconReload size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <CharacterHeader
            name={name}
            region={region}
            server={realm}
            data={data}
            loading={isFetching}
            isError={isError}
          />
          <LogsTable
            data={data?.logs?.raidRankings || []}
            metric={data?.logs?.metric || "dps"}
            loading={isFetching}
          />
        </Stack>
      </Container>
    </Page>
  );
}
