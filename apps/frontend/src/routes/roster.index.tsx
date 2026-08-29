import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Box,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconSearch, IconUsersGroup } from "@tabler/icons-react";
import { Page } from "../components/layout/Page";
import { storeRosterSecret, useCreateRoster } from "../queries/roster";
import { decodeRosterImport, CLASS_FILE_NAMES, type RosterImport } from "../util/rosterImport";
import { getClassColor, upperCaseFirstLetter } from "../util/util";
import { getRaidDisplayName, DEFAULT_RAID } from "../data/raidZones";
import classes from "../components/roster/Roster.module.css";

const MAX_CHARACTERS = 30;

/** Class/role hints from the export string, stashed for the results page so
 *  pending cards render in class colors before the lookup resolves. */
export function stashRosterHints(slug: string, decoded: RosterImport) {
  try {
    sessionStorage.setItem(`roster-hints-${slug}`, JSON.stringify(decoded.characters));
  } catch {
    // Session storage can be unavailable (private mode) — hints are cosmetic.
  }
}

const RosterPaste: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [decoded, setDecoded] = useState<RosterImport | null>(null);
  const createRoster = useCreateRoster();

  useEffect(() => {
    if (!input.trim()) {
      setDecoded(null);
      return;
    }
    let cancelled = false;
    void decodeRosterImport(input).then((result) => {
      if (!cancelled) setDecoded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const characters = decoded?.characters.slice(0, MAX_CHARACTERS) ?? [];
  const invalid = input.trim().length > 0 && decoded === null;

  const inspect = () => {
    if (!decoded || characters.length === 0) return;
    createRoster.mutate(
      {
        region: decoded.region,
        characters: characters.map((c) => ({ name: c.name, realm: c.realm })),
      },
      {
        onSuccess: (roster) => {
          storeRosterSecret(roster.region, roster.slug, roster.editSecret);
          stashRosterHints(roster.slug, decoded);
          void navigate({
            to: "/roster/$region/$slug",
            params: { region: roster.region, slug: roster.slug },
          });
        },
      }
    );
  };

  return (
    <Page>
      <Container size={960} px="md" py="xl" className={classes.typographyReset}>
        <Stack gap="lg">
          <Group align="stretch" gap="sm" wrap="nowrap">
            <Box
              w={3}
              style={{
                borderRadius: 2,
                background:
                  "linear-gradient(180deg, #c5bcf2 0%, #8b7fd4 60%, rgba(139,127,212,0.15) 100%)",
              }}
            />
            <Stack gap={4}>
              <Group gap="sm" align="center" wrap="wrap">
                <Title order={1} size="26px">
                  Roster Check
                </Title>
                <Text
                  component="span"
                  size="13px"
                  fw={600}
                  ff="var(--mantine-font-family-headings)"
                  style={{
                    color: "#c5bcf2",
                    background: "rgba(139, 127, 212, 0.12)",
                    border: "1px solid rgba(139, 127, 212, 0.4)",
                    borderRadius: 6,
                    padding: "3px 10px",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                >
                  {getRaidDisplayName(DEFAULT_RAID)}
                </Text>
              </Group>
              <Text size="13px" c="dimmed" maw={720}>
                Paste a roster export from the PugInspect addon and every character gets looked up
                at once — item level, RIO score, raid progress and log percentiles for the whole
                team on one screen.
              </Text>
            </Stack>
          </Group>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Paper withBorder radius="md" p="md">
                <Stack gap={10}>
                  <Group justify="space-between" gap={12}>
                    <Text size="10.5px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                      Paste roster
                    </Text>
                    <Text size="11px" c="dimmed" ff="monospace">
                      /pi export in-game, then paste here
                    </Text>
                  </Group>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onPaste={(e) => e.stopPropagation()}
                    placeholder="!PI1!…"
                    autosize
                    minRows={12}
                    maxRows={16}
                    spellCheck={false}
                    styles={{ input: { fontFamily: "monospace", fontSize: 12.5 } }}
                    error={invalid ? "Not a valid PugInspect export string" : undefined}
                  />
                  {characters.length > 0 && (
                    <Text size="12px" c="dimmed">
                      <Text component="span" c="bright" fw={600}>
                        {characters.length}
                      </Text>{" "}
                      characters detected · region {decoded!.region.toUpperCase()}
                      {(decoded?.characters.length ?? 0) > MAX_CHARACTERS &&
                        ` · first ${MAX_CHARACTERS} kept`}
                    </Text>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder radius="md" p="md">
                <Stack gap={12}>
                  <Group justify="space-between" gap={12}>
                    <Text size="10.5px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                      Detected
                    </Text>
                    <Text size="13px" fw={600} ff="var(--mantine-font-family-headings)">
                      {characters.length} / {MAX_CHARACTERS}
                    </Text>
                  </Group>
                  <Stack gap={4} mah={326} style={{ overflow: "auto" }}>
                    {characters.map((c) => (
                      <Group
                        key={`${c.name}-${c.realm}`}
                        gap={9}
                        wrap="nowrap"
                        px={8}
                        py={5}
                        style={{ borderRadius: 8, background: "rgba(8,14,28,0.5)" }}
                      >
                        <Box
                          w={8}
                          h={8}
                          style={{
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: c.classFile
                              ? getClassColor(CLASS_FILE_NAMES[c.classFile])
                              : "#4d5872",
                          }}
                        />
                        <Text size="12.5px" fw={500} truncate>
                          {upperCaseFirstLetter(c.name)}
                        </Text>
                        <Text size="11px" c="dimmed" ml="auto" style={{ whiteSpace: "nowrap" }}>
                          {c.realm}
                        </Text>
                      </Group>
                    ))}
                    {characters.length === 0 && (
                      <Text size="12px" c="dimmed">
                        Characters appear here once a valid export string is pasted.
                      </Text>
                    )}
                  </Stack>
                  <Button
                    leftSection={<IconSearch size={16} />}
                    disabled={characters.length === 0}
                    loading={createRoster.isPending}
                    onClick={inspect}
                  >
                    Inspect {characters.length > 0 ? characters.length : ""} characters
                  </Button>
                  <Text size="11.5px" c="dimmed" lh={1.5}>
                    Lookups are cached, so a re-check of the same roster is fast. A typo'd name
                    comes back as "not found" rather than failing the whole paste.
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>

          <Group gap={8} c="dimmed">
            <IconUsersGroup size={16} />
            <Text size="12.5px" c="dimmed">
              Get the export string with the PugInspect addon — type{" "}
              <Text component="span" ff="monospace" size="12px" c="bright">
                /pi export
              </Text>{" "}
              while in a raid group.
            </Text>
          </Group>
        </Stack>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/roster/")({
  head: () => ({
    meta: [
      { title: "Roster Check | PugInspect" },
      {
        name: "description",
        content:
          "Paste a raid roster export and inspect the whole team at once — item level, RIO score, raid progress and log percentiles for every character on one screen.",
      },
    ],
    links: [{ rel: "canonical", href: "https://puginspect.com/roster" }],
  }),
  component: RosterPaste,
});
