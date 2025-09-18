import { createFileRoute, useNavigate } from "@tanstack/react-router";
import "../App.css";
import {
  Autocomplete,
  Box,
  Center,
  Flex,
  Title,
  useMantineColorScheme,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { IconHome, IconMoon, IconSun } from "@tabler/icons-react";
import { useState } from "react";

const App: React.FC = () => {
  const hook = useMantineColorScheme();
  const navigate = useNavigate();
  const [loading] = useState(false);

  return (
    <div>
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
          <Flex direction="column" align="center" gap="sm">
            <Title order={1}>Welcome to PugInspect</Title>
            <Title order={3} w="500" style={{ textAlign: "center" }}>
              The ultimate character search tool for World of Warcraft
            </Title>
          </Flex>
          <Flex direction="column" align="center" gap="sm" mt="xl">
            <Autocomplete
              placeholder="Ceasevoker-Kazzak"
              data={[]}
              style={{ width: 350 }}
              comboboxProps={{
                transitionProps: { transition: "pop", duration: 200 },
              }}
              rightSection={loading ? <Loader size="xs" /> : null}
            />
            <Box mt="md" style={{ color: "gray" }}>
              Start by typing in a character name above to search for a
              character.
            </Box>
          </Flex>
        </Flex>
      </Center>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: App,
});
