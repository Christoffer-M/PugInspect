import {
  Container,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Paper,
  Title,
  Grid,
} from "@mantine/core";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterQuery } from "../queries/character-queries";
import { IconReload } from "@tabler/icons-react";
import { Metric } from "../graphql/graphql";

export const Route = createFileRoute("/$region/$realm/$name")({
  component: CharacterPage,
});

function CharacterPage() {
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
                loaderProps={{
                  size: "xs",
                  type: "dots",
                }}
                loading={isFetching}
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
            loading={isFetching}
            isError={isError}
          />
          <Grid grow w="100%">
            <Grid.Col span={4}>
              <Paper withBorder p="xs">
                <Group justify="space-between" align="center">
                  <Title order={4} m={0}>
                    DPS
                  </Title>
                  <Text c={data?.raiderIoScore?.dps?.color} fw={700}>
                    {data?.raiderIoScore?.dps?.score}
                  </Text>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="xs">
                <Group justify="space-between" align="center">
                  <Title order={4} m={0}>
                    Healer
                  </Title>

                  <Text c={data?.raiderIoScore?.healer?.color} fw={700}>
                    {data?.raiderIoScore?.healer?.score}
                  </Text>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder p="xs">
                <Group justify="space-between" align="center">
                  <Title order={4} m={0}>
                    Tank
                  </Title>
                  <Text c={data?.raiderIoScore?.tank?.color} fw={700}>
                    {data?.raiderIoScore?.tank?.score}
                  </Text>
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>

          <LogsTable
            data={data?.logs?.raidRankings || []}
            metric={data?.logs?.metric || Metric.Dps}
            loading={isFetching}
          />
        </Stack>
      </Container>
    </Page>
  );
}
