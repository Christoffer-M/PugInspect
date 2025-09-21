import { Container, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import Header from "../components/header";
import { regions } from "../components/characterSearchInput";
import { useSearch } from "@tanstack/react-router";
import { useCharacterQuery } from "../queries/character-queries";

type CharacterRouteSearch = {
  region: string;
  name: string;
  server: string;
};

const character: React.FC = () => {
  const { region, name, server } = useSearch({
    from: Route.fullPath,
  });

  const { data } = useCharacterQuery({
    name: name,
    realm: server,
    region: region,
  });

  console.log("data", data);

  return (
    <>
      <Header />
      <Container>
        <Text>{data?.name}</Text>
      </Container>
    </>
  );
};

export const Route = createFileRoute("/character")({
  component: character,
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
