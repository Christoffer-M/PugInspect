import { createFileRoute } from "@tanstack/react-router";
import { Center, Flex, Title, Container, Text } from "@mantine/core";
import CharacterSearchInput from "../components/CharacterSearchInput";
import { Page } from "../components/Page";

const Home: React.FC = () => {
  return (
    <Page>
      <Container>
        <Center h={"80vh"}>
          <Flex direction="column" align="center">
            <Flex direction="column" align="center">
              <Title order={1}>Welcome to PugInspect</Title>
              <Title order={4} style={{ textAlign: "center" }} mt={10} w={500}>
                The ultimate character search tool for World of Warcraft
              </Title>
            </Flex>
            <Flex direction="column" align="center" mt="xl">
              <CharacterSearchInput />

              <Text
                mt="md"
                c="dimmed"
                style={{ maxWidth: 400, textAlign: "center" }}
              >
                Start by typing in a character name above to search for a
                character. You can also paste a Raider.IO character profile URL.
              </Text>
            </Flex>
          </Flex>
        </Center>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
});
