import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import CharacterSearchInput from "../components/search/CharacterSearchInput";
import { Page } from "../components/layout/Page";
import { entryRealmSlug, useSearchHistory } from "../hooks/useSearchHistory";
import { getClassColor, upperCaseFirstLetter } from "../util/util";
import classes from "./index.module.css";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { history } = useSearchHistory();
  const recentChars = history.slice(0, 3).map((e) => ({
    label: `${upperCaseFirstLetter(e.name)}-${upperCaseFirstLetter(e.realm)}`,
    path: `/${e.region.toLowerCase()}/${entryRealmSlug(e)}/${e.name.toLowerCase()}`,
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
            Quickly view WoW character stats, M+ ratings, and raid logs
          </Text>

          <CharacterSearchInput />

          <Text className={classes.hint} m={0}>
            Start by typing a character name above
            {/* Phones can only paste into a text field. */}
            <Box component="span" visibleFrom="sm">
              , or paste a Raider.IO or PugInspect link — anywhere on this page
            </Box>
            .
          </Text>

          {recentChars.length > 0 && (
            <Group className={classes.chips} justify="center" wrap="wrap">
              {recentChars.map((char) => (
                <UnstyledButton
                  key={char.label}
                  className={classes.chip}
                  onClick={() => navigate({ to: char.path })}
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
  // Title/description are also prerendered into this route's static HTML —
  // keep in sync with apps/frontend/scripts/prerender.mjs.
  // Description and canonical come from the prerendered HTML (scripts/prerender.mjs).
  head: () => ({
    meta: [{ title: "PugInspect - WoW Character Inspector" }],
  }),
  component: Home,
});
