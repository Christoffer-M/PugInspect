import { Container, Stack } from "@mantine/core";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";
import { Page } from "../components/Page";
import { useCharacterQuery } from "../queries/character-queries";

export const Route = createFileRoute("/$region/$realm/$name")({
  component: RouteComponent,
});

function RouteComponent() {
  const { region, name, realm } = useParams({ from: Route.id });

  const { data, isFetching, isError } = useCharacterQuery({
    name: name,
    realm: realm,
    region: region,
  });

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center">
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
