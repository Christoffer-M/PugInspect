import { createFileRoute } from "@tanstack/react-router";
import { Box, Center, Flex, Title, Container } from "@mantine/core";
import CharacterSearchInput from "../components/characterSearchInput";
import { Page } from "../components/page";

const Home: React.FC = () => {
  return (
    <Page>
      <Container>
        <Center h={500}>
          <Flex direction="column" align="center">
            <Flex direction="column" align="center">
              <Title order={1}>Welcome to PugInspect</Title>
              <Title order={4} style={{ textAlign: "center" }} mt={10} w={500}>
                The ultimate character search tool for World of Warcraft
              </Title>
            </Flex>
            <Flex direction="column" align="center" mt="xl">
              <CharacterSearchInput />

              <Box mt="md" style={{ color: "gray" }}>
                Start by typing in a character name above to search for a
                character.
              </Box>
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
