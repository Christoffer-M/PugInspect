import { Container, Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { regions } from "../components/CharacterSearchInput";
import { useSearch } from "@tanstack/react-router";
import { useCharacterQuery } from "../queries/character-queries";
import { Page } from "../components/Page";
import { CharacterHeader } from "../components/CharacterHeader";
import { LogsTable } from "../components/LogsTable";

type CharacterRouteSearch = {
  region: string;
  name: string;
  server: string;
};

const Character: React.FC = () => {
  const { region, name, server } = useSearch({
    from: Route.fullPath,
  });

  const { data, isFetching, isError } = useCharacterQuery({
    name: name,
    realm: server,
    region: region,
  });

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center">
          <CharacterHeader
            name={name}
            region={region}
            server={server}
            data={data}
            loading={isFetching}
            isError={isError}
          />
          <LogsTable
            data={data?.logs?.raidRankings || []}
            loading={isFetching}
          />
        </Stack>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/character")({
  component: Character,
  validateSearch: (search): CharacterRouteSearch => {
    const { region, name, server } = search;
    if (
      !regions.includes(region as string) ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof server !== "string" ||
      !server.trim()
    ) {
      throw new Error("Invalid region, name, or server");
    }
    return {
      region: region as string,
      name: name as string,
      server: server as string,
    };
  },
});
