import React from "react";
import { ActionIcon, Badge, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { IconChartBarOff, IconX } from "@tabler/icons-react";
import { Difficulty } from "../../graphql/graphql";
import type { RosterEntry } from "../../queries/roster";
import { SpecImage } from "../ui/SpecImage";
import { ParsePill } from "../ui/ParsePill";
import { getClassColor, normalizeRealm, upperCaseFirstLetter } from "../../util/util";
import { DEFAULT_RAID, RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import { CLASS_FILE_NAMES } from "../../util/rosterImport";
import classes from "./Roster.module.css";

export const ROLE_COLORS: Record<string, string> = {
  TANK: "#3b82f6",
  HEALER: "#22c55e",
  DPS: "#f4a50e",
};

export const ROLE_TAGS: Record<string, string> = { TANK: "TANK", HEALER: "HEAL", DPS: "DPS" };

const DIFFICULTY_META: Record<string, { letter: string; word: string; color: string }> = {
  [Difficulty.Normal]: { letter: "N", word: "Normal", color: RAID_DIFFICULTY_COLORS.normal },
  [Difficulty.Heroic]: { letter: "H", word: "Heroic", color: RAID_DIFFICULTY_COLORS.heroic },
  [Difficulty.Mythic]: { letter: "M", word: "Mythic", color: RAID_DIFFICULTY_COLORS.mythic },
};

/** Boss kills at the given difficulty for the current raid, from RIO's
 *  all-difficulty progression (so a difficulty toggle never refetches this). */
export function progFor(
  entry: RosterEntry,
  difficulty: Difficulty
): { kills: number; total: number } | null {
  const prog = entry.character?.raiderIo?.raidProgression?.find((r) => r.raid === DEFAULT_RAID);
  if (!prog || prog.total_bosses == null) return null;
  const kills =
    difficulty === Difficulty.Normal
      ? prog.normal_bosses_killed
      : difficulty === Difficulty.Heroic
        ? prog.heroic_bosses_killed
        : prog.mythic_bosses_killed;
  return { kills: kills ?? 0, total: prog.total_bosses };
}

export type RosterCardHint = {
  name: string;
  realm: string;
  classFile?: string;
  role?: "TANK" | "HEALER" | "DPS";
};

type RosterCardProps = {
  region: string;
  hint: RosterCardHint;
  /** undefined while the chunk is still loading */
  entry?: RosterEntry;
  difficulty: Difficulty;
  /** Omitted for read-only viewers - hides the remove button. */
  onRemove?: () => void;
};

// Memoized: a 30-card grid re-rendering on every route render is the page's
// dominant cost, and card props only change when data or difficulty does.
export const RosterCard = React.memo(function RosterCard({
  region,
  hint,
  entry,
  difficulty,
  onRemove,
}: RosterCardProps) {
  const character = entry?.character;
  const notFound = entry?.notFound === true;
  const pending = entry === undefined;

  const className = character?.class ?? (hint.classFile ? CLASS_FILE_NAMES[hint.classFile] : undefined);
  const classColor = className ? getClassColor(className) : undefined;
  const role = entry?.role ?? (pending ? hint.role : undefined);
  const diff = DIFFICULTY_META[difficulty]!;
  const prog = entry ? progFor(entry, difficulty) : null;
  const best = character?.raidLogs?.bestPerformanceAverage;
  const median = character?.raidLogs?.medianPerformanceAverage;
  const name = character?.name ?? upperCaseFirstLetter(hint.name);

  const characterUrl = `/${region.toLowerCase()}/${normalizeRealm(character?.realm ?? hint.realm)}/${name.toLowerCase()}`;

  return (
    // A real link (new tab) rather than navigate(): the roster page is the
    // overview, and opening a character shouldn't lose it.
    <Paper
      component="a"
      href={notFound ? undefined : characterUrl}
      target="_blank"
      rel="noopener noreferrer"
      withBorder
      radius="md"
      className={`${classes.card} ${notFound ? classes.cardNotFound : ""}`}
      style={{ "--class-color": classColor, color: "inherit", textDecoration: "none" } as React.CSSProperties}
    >
      <div className={classes.accent} />

      <Group gap={12} wrap="nowrap" align="center">
        {className && character?.activeSpec ? (
          <span className={classes.iconRing}>
            <SpecImage className={className} spec={character.activeSpec} round />
          </span>
        ) : (
          <Skeleton circle h={30} w={30} animate={pending} />
        )}
        <Stack gap={1} miw={0} flex={1}>
          <Group gap={8} align="baseline" wrap="nowrap" miw={0}>
            <span className={classes.name}>{name}</span>
            {notFound && (
              <Badge size="xs" variant="light" color="orange" style={{ flexShrink: 0 }}>
                not found
              </Badge>
            )}
          </Group>
          <Text size="12px" c="dimmed" truncate>
            {character?.guild?.name ? `<${character.guild.name}> · ` : ""}
            {upperCaseFirstLetter(character?.realm ?? hint.realm)}
          </Text>
          <Text size="12px" c="dimmed" truncate>
            {character?.activeSpec
              ? `${character.activeSpec} ${character.class}`
              : pending
                ? "Looking up gear and logs…"
                : notFound
                  ? "Check the spelling and realm"
                  : (className ?? "")}
          </Text>
        </Stack>
        <Group gap={8} wrap="nowrap" align="flex-start" style={{ alignSelf: "flex-start" }}>
          {role && (
            <span className={classes.roleTag} style={{ "--role-color": ROLE_COLORS[role] } as React.CSSProperties}>
              {ROLE_TAGS[role]}
            </span>
          )}
          {onRemove && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              className={classes.removeButton}
              title="Remove from roster"
              onClick={(e) => {
                // Inside an anchor: preventDefault stops the card link opening.
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      {pending && (
        <Stack gap={10} mt={12} pt={11} style={{ borderTop: "1px solid rgba(61,79,110,0.28)" }}>
          <Group gap={14}>
            <Skeleton h={22} w={64} />
            <Skeleton h={22} w={64} />
            <Skeleton h={22} w={64} />
          </Group>
          <Skeleton h={6} radius="xl" />
          <Skeleton h={6} w="78%" radius="xl" />
        </Stack>
      )}

      {!pending && !notFound && (
        <>
          <div className={classes.statsRow}>
            <div className={classes.statCell}>
              <span className={classes.statLabel}>Item lvl</span>
              <span
                className={classes.statValue}
                style={{
                  color:
                    character?.equippedItemLevel != null ? "#e6ebf5" : "var(--mantine-color-dark-2)",
                }}
              >
                {character?.equippedItemLevel ?? "-"}
              </span>
            </div>
            <div className={classes.statCell}>
              <span className={classes.statLabel}>RIO</span>
              <span
                className={classes.statValue}
                style={{ color: character?.raiderIo?.currentSeason?.all?.color ?? "var(--mantine-color-dark-2)" }}
              >
                {character?.raiderIo?.currentSeason?.all?.score != null
                  ? Math.round(character.raiderIo.currentSeason.all.score).toLocaleString()
                  : "-"}
              </span>
            </div>
            <div className={classes.statCell}>
              <span className={classes.statLabel}>Prog</span>
              <span
                className={classes.statValue}
                style={{ color: prog && prog.kills > 0 ? diff.color : "var(--mantine-color-dark-2)" }}
              >
                {prog ? `${prog.kills}/${prog.total} ${diff.letter}` : "-"}
              </span>
            </div>
          </div>

          {best != null ? (
            <Stack gap={6} mt={10}>
              <Group gap={10} wrap="nowrap">
                <span className={classes.statLabel} style={{ width: 44, flexShrink: 0 }}>
                  Best
                </span>
                <ParsePill value={best} grow />
              </Group>
              <Group gap={10} wrap="nowrap">
                <span className={classes.statLabel} style={{ width: 44, flexShrink: 0 }}>
                  Median
                </span>
                <ParsePill value={median} grow />
              </Group>
            </Stack>
          ) : (
            <div className={classes.noLogs} style={{ marginTop: 10 }}>
              <IconChartBarOff size={14} color="var(--mantine-color-dark-2)" />
              <Text size="12px" c="dimmed">
                {prog && prog.kills > 0 ? `No logged ${diff.word} pulls` : `No ${diff.word} kills yet`}
              </Text>
            </div>
          )}
        </>
      )}
    </Paper>
  );
});
