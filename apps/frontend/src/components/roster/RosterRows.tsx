import React from "react";
import { ActionIcon, Badge, Group, Paper, Skeleton, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Difficulty } from "../../graphql/graphql";
import type { RosterEntry } from "../../queries/roster";
import { SpecImage } from "../ui/SpecImage";
import { ParsePill } from "../ui/ParsePill";
import { getClassColor, normalizeRealm, upperCaseFirstLetter } from "../../util/util";
import { RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import { CLASS_FILE_NAMES } from "../../util/rosterImport";
import { progFor, ROLE_COLORS, type RosterCardHint } from "./RosterCard";
import classes from "./Roster.module.css";

const DIFF_LETTER: Record<string, string> = {
  [Difficulty.Normal]: "N",
  [Difficulty.Heroic]: "H",
  [Difficulty.Mythic]: "M",
};

const DIFF_COLOR: Record<string, string> = {
  [Difficulty.Normal]: RAID_DIFFICULTY_COLORS.normal,
  [Difficulty.Heroic]: RAID_DIFFICULTY_COLORS.heroic,
  [Difficulty.Mythic]: RAID_DIFFICULTY_COLORS.mythic,
};

export type RosterRowItem = {
  hint: RosterCardHint;
  entry?: RosterEntry;
  onRemove?: () => void;
};

/** Group key for a row: pending → looking up, then role, then not found. */
function groupOf(entry?: RosterEntry): string {
  if (!entry) return "PENDING";
  if (entry.notFound) return "NOTFOUND";
  return entry.role ?? "OTHER";
}

const GROUPS: { key: string; label: string; color: string }[] = [
  { key: "PENDING", label: "Looking up", color: "#6b7590" },
  { key: "TANK", label: "Tanks", color: ROLE_COLORS.TANK! },
  { key: "HEALER", label: "Healers", color: ROLE_COLORS.HEALER! },
  { key: "DPS", label: "DPS", color: ROLE_COLORS.DPS! },
  { key: "OTHER", label: "Other", color: "#6b7590" },
  { key: "NOTFOUND", label: "Not found", color: "#ff8a3d" },
];

const Row = React.memo(function Row({
  region,
  hint,
  entry,
  difficulty,
  onRemove,
}: RosterRowItem & { region: string; difficulty: Difficulty }) {
  const character = entry?.character;
  const notFound = entry?.notFound === true;
  const pending = entry === undefined;

  const className =
    character?.class ?? (hint.classFile ? CLASS_FILE_NAMES[hint.classFile] : undefined);
  const classColor = className ? getClassColor(className) : undefined;
  const prog = entry ? progFor(entry, difficulty) : null;
  const name = character?.name ?? upperCaseFirstLetter(hint.name);
  const realm = upperCaseFirstLetter(character?.realm ?? hint.realm);
  const rio = character?.raiderIo?.currentSeason?.all?.score;
  const best = character?.raidLogs?.bestPerformanceAverage;
  // Cast keeps `href` typed; React drops it when it's undefined on a div.
  const Tag = (notFound ? "div" : "a") as "a";

  return (
    // Plain <a>, not <Paper component="a">: Paper writes an inline background
    // that the :hover rule can't override.
    <Tag
      href={notFound ? undefined : `/${region.toLowerCase()}/${normalizeRealm(character?.realm ?? hint.realm)}/${name.toLowerCase()}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${classes.rowGrid} ${classes.row} ${notFound ? classes.rowNotFound : ""}`}
      style={{ "--class-color": classColor } as React.CSSProperties}
    >
      <Group gap={10} wrap="nowrap" miw={0}>
        {className && character?.activeSpec ? (
          <span className={classes.rowIconRing}>
            <SpecImage className={className} spec={character.activeSpec} round />
          </span>
        ) : (
          <Skeleton circle h={26} w={26} animate={pending} />
        )}
        <div style={{ minWidth: 0 }}>
          <Group gap={7} align="baseline" wrap="nowrap" miw={0}>
            <span className={classes.rowName}>{name}</span>
            {notFound && (
              <Badge size="xs" variant="light" color="orange" style={{ flexShrink: 0 }}>
                not found
              </Badge>
            )}
          </Group>
          <Text size="11px" c="dimmed" truncate>
            {character?.activeSpec ? `${character.activeSpec} ${character.class} · ` : ""}
            {realm}
          </Text>
        </div>
      </Group>

      <span
        className={classes.rowValue}
        style={{ color: character?.equippedItemLevel != null ? "#e6ebf5" : "var(--mantine-color-dark-2)" }}
      >
        {character?.equippedItemLevel ?? "-"}
      </span>
      <span
        className={classes.rowValue}
        style={{ color: character?.raiderIo?.currentSeason?.all?.color ?? "var(--mantine-color-dark-2)" }}
      >
        {rio != null ? Math.round(rio).toLocaleString() : "-"}
      </span>
      <span
        className={classes.rowValue}
        style={{ color: prog && prog.kills > 0 ? DIFF_COLOR[difficulty] : "var(--mantine-color-dark-2)" }}
      >
        {prog ? `${prog.kills}/${prog.total} ${DIFF_LETTER[difficulty]}` : "-"}
      </span>

      {best != null || !character ? (
        <span className={classes.rowParse}>
          <ParsePill value={best} />
        </span>
      ) : (
        <Text size="11.5px" c="dimmed">
          {prog && prog.kills > 0 ? "no logs" : "no kills"}
        </Text>
      )}
      <span className={classes.rowParse}>
        <ParsePill value={best != null ? character?.raidLogs?.medianPerformanceAverage : null} />
      </span>

      {onRemove ? (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          className={classes.removeButton}
          title="Remove from roster"
          onClick={(e) => {
            // Inside an anchor: preventDefault stops the row link opening.
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <IconX size={14} />
        </ActionIcon>
      ) : (
        <span />
      )}
    </Tag>
  );
});

export const RosterRows: React.FC<{
  region: string;
  items: RosterRowItem[];
  difficulty: Difficulty;
}> = ({ region, items, difficulty }) => (
  <Paper withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
    <div className={classes.rowsScroll}>
      <div className={classes.rowsInner}>
        <div className={`${classes.rowGrid} ${classes.rowsHeader}`}>
          <span className={classes.summaryLabel}>Character</span>
          <span className={classes.summaryLabel}>Item lvl</span>
          <span className={classes.summaryLabel}>RIO</span>
          <span className={classes.summaryLabel}>Prog</span>
          <span className={classes.summaryLabel}>Best %</span>
          <span className={classes.summaryLabel}>Median %</span>
          <span />
        </div>
        {GROUPS.map(({ key, label, color }) => {
          const group = items.filter((i) => groupOf(i.entry) === key);
          if (group.length === 0) return null;
          return (
            <div key={key}>
              <div className={classes.groupHeader}>
                <span className={classes.groupDot} style={{ "--dot-color": color } as React.CSSProperties} />
                <span className={classes.groupLabel}>{label}</span>
                <span className={classes.groupCount}>{group.length}</span>
              </div>
              {group.map((item) => (
                <Row
                  key={`${item.hint.name}-${item.hint.realm}`}
                  region={region}
                  difficulty={difficulty}
                  {...item}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  </Paper>
);
