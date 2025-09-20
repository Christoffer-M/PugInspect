import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Autocomplete,
  Box,
  Center,
  Flex,
  Title,
  useMantineColorScheme,
  ActionIcon,
  Loader,
  Typography,
  Container,
  Select,
} from "@mantine/core";
import { IconHome, IconMoon, IconSun } from "@tabler/icons-react";
import { useState } from "react";

const regions = ["EU", "US", "KR", "TW", "CN", "OCE", "SA", "RU"];

const App: React.FC = () => {
  const hook = useMantineColorScheme();
  const navigate = useNavigate();
  const [loading] = useState(false);
  const [region, setRegion] = useState(localStorage.getItem("region") || "EU");

  return (
    <Typography>
      <Container>
        <Flex justify="flex-start" p="md" gap="md">
          <ActionIcon
            variant="outline"
            onClick={() => navigate({ to: "/" })}
            aria-label="Go to home page"
            size="lg"
          >
            <IconHome />
          </ActionIcon>
          <ActionIcon
            variant="outline"
            color={hook.colorScheme === "dark" ? "yellow" : "blue"}
            onClick={() => hook.toggleColorScheme()}
            aria-label="Toggle color scheme"
            size="lg"
          >
            {hook.colorScheme === "dark" ? <IconSun /> : <IconMoon />}
          </ActionIcon>
        </Flex>
        <Center h={500}>
          <Flex direction="column" align="center">
            <Flex direction="column" align="center">
              <Title order={1}>Welcome to PugInspect</Title>
              <Title order={4} style={{ textAlign: "center" }} mt={10} w={500}>
                The ultimate character search tool for World of Warcraft
              </Title>
            </Flex>
            <Flex direction="column" align="center" mt="xl">
              <Flex gap="xs">
                <Select
                  placeholder="EU"
                  data={regions}
                  w="75"
                  value={region}
                  onChange={(value) => {
                    setRegion(value || "EU");
                    localStorage.setItem("region", value || "EU");
                  }}
                />
                <Autocomplete
                  placeholder="Ceasevoker-Kazzak"
                  data={[]}
                  style={{ width: 350 }}
                  comboboxProps={{
                    transitionProps: { transition: "pop", duration: 200 },
                  }}
                  rightSection={loading ? <Loader size="xs" /> : null}
                />
              </Flex>

              <Box mt="md" style={{ color: "gray" }}>
                Start by typing in a character name above to search for a
                character.
              </Box>
            </Flex>
          </Flex>
        </Center>
      </Container>
    </Typography>
  );
};

export const Route = createFileRoute("/")({
  component: App,
});
