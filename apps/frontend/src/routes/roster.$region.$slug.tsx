import { useEffect, useMemo, useState } from "react";
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
  clearRosterSecret,
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
import { Difficulty, RoleType } from "../graphql/graphql";
import { getRaidDisplayName, DEFAULT_RAID, RAIDS } from "../data/raidZones";
import { parseNameRealm, type RosterImportCharacter } from "../util/rosterImport";
import { normalizeRealm, parseCharacterUrl } from "../util/util";
import { useWindowEvent } from "@mantine/hooks";
import classes from "../components/roster/Roster.module.css";

const MAX_CHARACTERS = 30;

const DIFFICULTY_OPTIONS = [
  { value: Difficulty.Normal, label: "Normal" },
  { value: Difficulty.Heroic, label: "Heroic" },
  { value: Difficulty.Mythic, label: "Mythic" },
];

/** Owns the input state so typing re-renders only this control, not the
 *  30-card grid behind it. */
const AddMemberControl: React.FC<{
  isOwner: boolean;
  full: boolean;
  slotsText: string;
  loading: boolean;
  onAdd: (c: { name: string; realm: string }) => void;
}> = ({ isOwner, full, slotsText, loading, onAdd }) => {
  const [value, setValue] = useState("");
  const add = () => {
    // Same parser as the export-string decoder, so a manually typed
    // "Bob-TarrenMill" or a Russian realm slugs identically to a paste.
    const parsed = parseNameRealm(value);
    if (!parsed) return;
    setValue("");
    onAdd(parsed);
  };
  return (
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
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          leftSection={<IconUserPlus size={14} />}
          disabled={!isOwner || full}
        />
        <Button size="xs" variant="light" onClick={add} disabled={!isOwner} loading={loading}>
          Add
        </Button>
        <Text size="11.5px" c="dimmed">
          {slotsText}
        </Text>
      </Group>
    </Tooltip>
  );
};

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
  const hints = useMemo(() => readHints(slug), [slug]);
  // Owner = whoever holds this slug's edit secret. State (not a memo) so a
  // server-rejected secret can drop the page to read-only immediately.
  const [isOwner, setIsOwner] = useState(() => readRosterSecret(region, slug) !== null);
  useEffect(() => {
    setIsOwner(readRosterSecret(region, slug) !== null);
  }, [region, slug]);

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
   *  card back to a skeleton (and refetching data that can't have changed).
   *  Placeholder chunks are excluded: during a difficulty switch they still
   *  hold the PREVIOUS difficulty's entries, and seeding those under the new
   *  difficulty's keys would show wrong parses as fresh for 15 minutes. */
  const seedChunkCache = (next: RosterCharacterKey[]) => {
    const byKey = new Map<string, RosterEntry>();
    chunkResults.forEach((result, chunk) => {
      if (!result.data || result.isPlaceholderData) return;
      result.data.forEach((entry, i) => {
        const c = characters[chunk * ROSTER_CHUNK_SIZE + i];
        if (c) byKey.set(`${c.name}:${c.realm}`, entry);
      });
    });
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
        // Mutations don't hit the global query-error toast, so surface
        // failures here — and only treat an actual secret rejection as an
        // ownership problem; a network blip or 500 is not one.
        onError: (error) => {
          const secretRejected = /edit secret/i.test(
            error instanceof Error ? error.message : String(error)
          );
          if (secretRejected) {
            // Keeping the dead secret would leave the edit UI enabled with
            // every action failing — evict it and drop to read-only.
            clearRosterSecret(region, slug);
            setIsOwner(false);
          }
          notifications.show({
            title: "Couldn't update roster",
            message: secretRejected
              ? "This browser's edit access is no longer valid — the roster is now read-only here."
              : "Something went wrong — try again.",
            color: "red",
          });
        },
      }
    );
  };

  const addCharacter = (c: { name: string; realm: string }) => {
    editRoster([
      ...characters.map(({ name, realm }) => ({ name, realm })),
      { name: c.name.toLowerCase(), realm: c.realm },
    ]);
  };

  // A pasted PugInspect/RaiderIO character URL adds that character to the
  // roster (the site-wide handler in Page.tsx yields to this route). Read-only
  // viewers keep the site-wide behavior: the character page opens instead.
  useWindowEvent("paste", (event: ClipboardEvent) => {
    const characterUrl = parseCharacterUrl(event.clipboardData?.getData("text") ?? "");
    if (!characterUrl) return;
    event.preventDefault();
    const name = characterUrl.name.toLowerCase();
    const realm = normalizeRealm(characterUrl.realm);
    const charRegion = characterUrl.region.toLowerCase();
    if (!isOwner) {
      void navigate({
        to: "/$region/$realm/$name",
        params: { region: charRegion, realm, name },
        search: { roleType: RoleType.Any },
      });
      return;
    }
    if (charRegion !== region.toLowerCase()) {
      notifications.show({
        title: "Different region",
        message: `This roster is ${region.toUpperCase()} — that character is ${charRegion.toUpperCase()}.`,
        color: "yellow",
      });
      return;
    }
    if (characters.some((c) => c.name === name && c.realm === realm)) {
      notifications.show({
        title: "Already in the roster",
        message: `${characterUrl.name} is already on this roster.`,
        color: "yellow",
      });
      return;
    }
    addCharacter({ name, realm });
  });

  if (roster.isPending) {
    return (
      <Page>
        <Center py={120}>
          <Loader />
        </Center>
      </Page>
    );
  }

  // A failed fetch is NOT "roster not found" — the backend only returns null
  // for a genuinely missing row, and this null gets cached with
  // staleTime: Infinity, so a network blip must never be mistaken for it.
  if (roster.isError) {
    return (
      <Page>
        <Container size={960} px="md" py="xl" className={classes.typographyReset}>
          <Stack align="flex-start" gap="sm">
            <Title order={1} size="26px">
              Couldn't load this roster
            </Title>
            <Text c="dimmed" size="14px">
              Something went wrong while fetching the roster — this is usually temporary.
            </Text>
            <Button onClick={() => void roster.refetch()}>Try again</Button>
          </Stack>
        </Container>
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
            <AddMemberControl
              isOwner={isOwner}
              full={characters.length >= MAX_CHARACTERS}
              slotsText={`${characters.length} / ${MAX_CHARACTERS} slots`}
              loading={updateRoster.isPending}
              onAdd={addCharacter}
            />
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
                  {failedChunks.length === chunkResults.length
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

          <div className={classes.grid}>
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
