import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import CharacterSearchInput from "../components/search/CharacterSearchInput";
import { Page } from "../components/layout/Page";
import { useEffect } from "react";
import classes from "./index.module.css";

const QUICK_CHARS = [
  { label: "Baldrin-Draenor", region: "eu", realm: "draenor", name: "baldrin", color: "#C69B3A" },
  { label: "Ceases-Kazzak", region: "eu", realm: "kazzak", name: "ceases", color: "#4d93ff" },
  { label: "Vaelra-Silvermoon", region: "eu", realm: "silvermoon", name: "vaelra", color: "#b072f0" },
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "PugInspect - WoW Character Inspector";
  }, []);

  return (
    <Page>
      <Box className={classes.landing}>
        <Stack className={classes.inner} align="center">
          <Box className={classes.glyph}>
            <IconSearch size={30} stroke={1.8} />
          </Box>

          <Title order={1} mb="sm">
            Welcome to PugInspect
          </Title>

          <Text className={classes.tag}>
            Quickly view WoW character stats, RIO scores, and raid logs
          </Text>

          <CharacterSearchInput />

          <Text className={classes.hint}>
            Start by typing a character name above, or paste a Raider.IO profile URL.
          </Text>

          <Group className={classes.chips} justify="center" wrap="wrap">
            {QUICK_CHARS.map((char) => (
              <UnstyledButton
                key={char.label}
                className={classes.chip}
                onClick={() => navigate({ to: `/${char.region}/${char.realm}/${char.name}` })}
              >
                <Box component="span" className={classes.chipDot} style={{ background: char.color }} />
                {char.label}
              </UnstyledButton>
            ))}
          </Group>
        </Stack>
      </Box>
    </Page>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
});
