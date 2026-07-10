import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import CharacterSearchInput from "../components/search/CharacterSearchInput";
import { Page } from "../components/layout/Page";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { getClassColor, upperCaseFirstLetter } from "../util/util";
import classes from "./index.module.css";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { history } = useSearchHistory();
  const recentChars = history.slice(0, 3).map((e) => ({
    label: `${upperCaseFirstLetter(e.name)}-${upperCaseFirstLetter(e.realm)}`,
    region: e.region,
    realm: e.realm,
    name: e.name,
    color: getClassColor(e.class),
  }));

  return (
    <Page>
      <Box className={classes.landing}>
        <Stack className={classes.inner} align="center" gap="md">
          <Box className={classes.glyph}>
            <IconSearch size={30} stroke={1.8} />
          </Box>

          <Title order={1} m={0}>
            Welcome to PugInspect
          </Title>

          <Text className={classes.tag} m={0}>
            Quickly view WoW character stats, RIO scores, and raid logs
          </Text>

          <CharacterSearchInput />

          <Text className={classes.hint} m={0}>
            Start by typing a character name above, or paste a Raider.IO profile URL.
          </Text>

          {recentChars.length > 0 && (
            <Group className={classes.chips} justify="center" wrap="wrap">
              {recentChars.map((char) => (
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
          )}
        </Stack>
      </Box>
    </Page>
  );
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "PugInspect - WoW Character Inspector" }],
    links: [{ rel: "canonical", href: "https://puginspect.com/" }],
  }),
  component: Home,
});
