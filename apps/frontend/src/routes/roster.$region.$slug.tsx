import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  CopyButton,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconLink, IconUserPlus } from "@tabler/icons-react";
import { Page } from "../components/layout/Page";
import { RosterCard, type RosterCardHint } from "../components/roster/RosterCard";
import { RosterSummary } from "../components/roster/RosterSummary";
import {
  readRosterSecret,
  ROSTER_CHUNK_SIZE,
  useRoster,
  useRosterChunks,
  useUpdateRoster,
  type RosterCharacterKey,
  type RosterEntry,
} from "../queries/roster";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { Difficulty } from "../graphql/graphql";
import { normalizeRealm } from "../util/util";
import { getRaidDisplayName, DEFAULT_RAID, RAIDS } from "../data/raidZones";
import type { RosterImportCharacter } from "../util/rosterImport";
import classes from "../components/roster/Roster.module.css";

const MAX_CHARACTERS = 30;

const DIFFICULTY_OPTIONS = [
  { value: Difficulty.Normal, label: "Normal" },
  { value: Difficulty.Heroic, label: "Heroic" },
  { value: Difficulty.Mythic, label: "Mythic" },
];

function readHints(slug: string): Map<string, RosterCardHint> {
  try {
    const raw = sessionStorage.getItem(`roster-hints-${slug}`);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as RosterImportCharacter[];
    return new Map(parsed.map((c) => [`${c.name.toLowerCase()}:${c.realm}`, c]));
  } catch {
    return new Map();
  }
}

const RosterResults: React.FC = () => {
  const { region, slug } = Route.useParams();
  const navigate = useNavigate();
  const roster = useRoster(region, slug);
  const updateRoster = useUpdateRoster();
  const queryClient = useQueryClient();
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Heroic);
  const [addValue, setAddValue] = useState("");
  const hints = useMemo(() => readHints(slug), [slug]);
  // Owner = whoever holds this slug's edit secret in localStorage.
  const isOwner = useMemo(() => readRosterSecret(region, slug) !== null, [region, slug]);

  const characters = useMemo(() => roster.data?.characters ?? [], [roster.data]);
  const zoneId = RAIDS[DEFAULT_RAID]?.zoneId;

  const chunkResults = useRosterChunks({
    region,
    characters,
    difficulty,
    zoneId,
    enabled: characters.length > 0,
  });

  // Roster order is preserved end-to-end (stored normalized + deduped), so
  // entries map back to characters by position across the chunks. A chunk
  // that hasn't resolved contributes exactly its own size in placeholders.
  const entriesByIndex = useMemo(() => {
    const entries: (RosterEntry | undefined)[] = [];
    for (let i = 0, chunk = 0; i < characters.length; i += ROSTER_CHUNK_SIZE, chunk++) {
      const size = Math.min(ROSTER_CHUNK_SIZE, characters.length - i);
      const data = chunkResults[chunk]?.data;
      entries.push(...(data ?? Array<RosterEntry | undefined>(size).fill(undefined)));
    }
    return entries;
  }, [chunkResults, characters.length]);

  const resolvedEntries = useMemo(
    () => entriesByIndex.filter((e): e is RosterEntry => e !== undefined),
    [entriesByIndex]
  );

  // Card order: Tank → Healer → DPS → role unknown → not found, then item
  // level descending within each group. Pending cards sort by their addon
  // role hint so they land near their final spot before data arrives.
  const sortedCards = useMemo(() => {
    const roleRank: Record<string, number> = { TANK: 0, HEALER: 1, DPS: 2 };
    return characters
      .map((character, index) => ({
        character,
        entry: entriesByIndex[index],
        hint: hints.get(`${character.name}:${character.realm}`) ?? {
          name: character.name,
          realm: character.realm,
        },
      }))
      .sort((a, b) => {
        const rank = (c: (typeof a) & object) =>
          c.entry?.notFound
            ? 4
            : (roleRank[c.entry?.role ?? c.hint.role ?? ""] ?? 3);
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        const ilvl = (c: typeof a) => c.entry?.character?.equippedItemLevel ?? -1;
        return ilvl(b) - ilvl(a);
      });
  }, [characters, entriesByIndex, hints]);
  const notFoundCount = resolvedEntries.filter((e) => e.notFound).length;
  const failedChunks = chunkResults.filter((r) => r.isError);

  /** Pre-fill the chunk cache for an edited character list from entries we
   *  already have, so an edit re-renders in place instead of dropping every
   *  card back to a skeleton (and refetching data that can't have changed). */
  const seedChunkCache = (next: RosterCharacterKey[]) => {
    const byKey = new Map(characters.map((c, i) => [`${c.name}:${c.realm}`, entriesByIndex[i]]));
    for (let i = 0; i < next.length; i += ROSTER_CHUNK_SIZE) {
      const chunk = next.slice(i, i + ROSTER_CHUNK_SIZE);
      const entries = chunk.map((c) => byKey.get(`${c.name}:${c.realm}`));
      // Only seed fully-known chunks — an added member still needs a real fetch.
      if (entries.every((e): e is RosterEntry => e !== undefined)) {
        queryClient.setQueryData(queryKeys.rosterChunk(region, difficulty, chunk), entries);
      }
    }
  };

  /** Rosters are read-only for everyone except the creator: edits require the
   *  slug's edit secret from localStorage. */
  const editRoster = (next: { name: string; realm: string }[]) => {
    const secret = readRosterSecret(region, slug);
    if (
      !secret ||
      next.length === 0 ||
      next.length > MAX_CHARACTERS ||
      updateRoster.isPending
    ) {
      return;
    }
    updateRoster.mutate(
      { region, slug, editSecret: secret, characters: next },
      {
        onSuccess: (updated) => {
          seedChunkCache(updated.characters);
          queryClient.setQueryData(queryKeys.roster(region, slug), updated);
        },
        // e.g. a stale secret in another browser profile — mutations don't
        // hit the global query-error toast, so surface it here.
        onError: () =>
          notifications.show({
            title: "Couldn't update roster",
            message: "Only the browser that created this roster can edit it.",
            color: "red",
          }),
      }
    );
  };

  const addCharacter = () => {
    const trimmed = addValue.trim();
    const dash = trimmed.indexOf("-");
    if (dash <= 0) return;
    const name = trimmed.slice(0, dash).trim().toLowerCase();
    const realm = normalizeRealm(trimmed.slice(dash + 1));
    if (!name || !realm) return;
    setAddValue("");
    editRoster([...characters.map(({ name, realm }) => ({ name, realm })), { name, realm }]);
  };

  if (roster.isPending) {
    return (
      <Page>
        <Center py={120}>
          <Loader />
        </Center>
      </Page>
    );
  }

  if (!roster.data) {
    return (
      <Page>
        <Container size={960} px="md" py="xl" className={classes.typographyReset}>
          <Stack align="flex-start" gap="sm">
            <Title order={1} size="26px">
              Roster not found
            </Title>
            <Text c="dimmed" size="14px">
              This roster link doesn't exist (or the region doesn't match). Paste a fresh export to
              start a new check.
            </Text>
            <Button onClick={() => void navigate({ to: "/roster" })}>New paste</Button>
          </Stack>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container size={1140} px="md" py="xl" className={classes.typographyReset}>
        <Stack gap="md">
          <Group align="flex-end" justify="space-between" wrap="wrap" gap="sm">
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
                <Text size="13px" c="dimmed">
                  {resolvedEntries.length - notFoundCount} of {characters.length} characters
                  resolved
                  {notFoundCount > 0 ? ` · ${notFoundCount} not found` : ""}
                </Text>
              </Stack>
            </Group>
            <Group gap={8}>
              <CopyButton value={typeof window !== "undefined" ? window.location.href : ""}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied" : "Copy share link"} withArrow>
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={copied ? <IconCheck size={14} /> : <IconLink size={14} />}
                      onClick={copy}
                    >
                      {region}/{slug}
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>
              <Button variant="default" size="xs" onClick={() => void navigate({ to: "/roster" })}>
                New paste
              </Button>
            </Group>
          </Group>

          <RosterSummary
            entries={resolvedEntries}
            totalCount={characters.length}
            difficulty={difficulty}
          />

          <Group justify="space-between" gap="md" wrap="wrap">
            <Group gap={10}>
              <Text size="10.5px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                Difficulty
              </Text>
              <SegmentedControl
                size="xs"
                value={difficulty}
                onChange={(value) => setDifficulty(value as Difficulty)}
                data={DIFFICULTY_OPTIONS}
              />
            </Group>
            <Tooltip
              label="This roster is read-only — only its creator can edit it. Paste your own roster to build on this one."
              withArrow
              disabled={isOwner}
            >
              <Group gap={8}>
                <TextInput
                  size="xs"
                  w={180}
                  placeholder="Add Name-Realm"
                  value={addValue}
                  onChange={(e) => setAddValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCharacter();
                  }}
                  leftSection={<IconUserPlus size={14} />}
                  disabled={!isOwner || characters.length >= MAX_CHARACTERS}
                />
                <Button
                  size="xs"
                  variant="light"
                  onClick={addCharacter}
                  disabled={!isOwner}
                  loading={updateRoster.isPending}
                >
                  Add
                </Button>
                <Text size="11.5px" c="dimmed">
                  {characters.length} / {MAX_CHARACTERS} slots
                </Text>
              </Group>
            </Tooltip>
          </Group>

          {failedChunks.length > 0 && (
            <Alert
              color="orange"
              variant="light"
              icon={<IconAlertTriangle size={16} />}
              title="Some lookups failed"
            >
              <Group gap="sm">
                <Text size="13px">
                  {failedChunks.length * 10 >= characters.length
                    ? "The lookup failed"
                    : "Part of the roster couldn't be fetched"}{" "}
                  — this can happen when upstream APIs are briefly rate-limited.
                </Text>
                <Button size="compact-xs" variant="light" color="orange" onClick={() => failedChunks.forEach((r) => void r.refetch())}>
                  Retry
                </Button>
              </Group>
            </Alert>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 12,
            }}
          >
            {sortedCards.map(({ character, entry, hint }) => (
              <RosterCard
                key={`${character.name}-${character.realm}`}
                region={region}
                hint={hint}
                entry={entry}
                difficulty={difficulty}
                onRemove={
                  isOwner
                    ? () =>
                        editRoster(
                          characters
                            .filter(
                              (c) => !(c.name === character.name && c.realm === character.realm)
                            )
                            .map(({ name, realm }) => ({ name, realm }))
                        )
                    : undefined
                }
              />
            ))}
          </div>

          <Text size="11.5px" c="dimmed" mt={2}>
            Percentiles are all-star ranks for {difficulty} {getRaidDisplayName(DEFAULT_RAID)} ·
            click any character to open their full PugInspect page.
          </Text>
        </Stack>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/roster/$region/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Roster Check | PugInspect" },
      {
        name: "description",
        content: "A shared raid roster check — every character's gear, score and logs at a glance.",
      },
    ],
    links: [
      { rel: "canonical", href: `https://puginspect.com/roster/${params.region}/${params.slug}` },
    ],
  }),
  component: RosterResults,
});
