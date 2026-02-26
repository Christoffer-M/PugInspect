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
              <Title order={1} ta={'center'}>Welcome to PugInspect</Title>
              <Title order={4} style={{ textAlign: "center" }} mt="sm">
                Quickly view WoW character stats, RIO scores, and raid logs
              </Title>
            </Flex>
            <Flex direction="column" align="center" mt="xl" w="100%" maw={450}>
              <CharacterSearchInput />

              <Text
                mt="md"
                c="dimmed"
                style={{ maxWidth: "100%", textAlign: "center" }}
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
