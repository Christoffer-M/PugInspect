import { useMemo } from "react";
import { Group, Paper, Progress, Text } from "@mantine/core";
import { Difficulty } from "../../graphql/graphql";
import type { RosterEntry } from "../../queries/roster";
import { getParseColor } from "../../util/util";
import { RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import { progFor, ROLE_COLORS } from "./RosterCard";
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

type RosterSummaryProps = {
  /** Entries from resolved chunks only - the bar recomputes as chunks land. */
  entries: RosterEntry[];
  totalCount: number;
  difficulty: Difficulty;
};

export const RosterSummary: React.FC<RosterSummaryProps> = ({ entries, totalCount, difficulty }) => {
  const stats = useMemo(() => {
    const found = entries.filter((e) => !e.notFound && e.character);
    const ilvls = found
      .map((e) => e.character!.equippedItemLevel)
      .filter((v): v is number => v != null);
    const rios = found
      .map((e) => e.character!.raiderIo?.currentSeason?.all?.score)
      .filter((v): v is number => v != null)
      .map(Math.round);
    const progs = found
      .map((e) => progFor(e, difficulty))
      .filter((p): p is { kills: number; total: number } => p != null);
    const bests = found
      .map((e) => e.character!.raidLogs?.bestPerformanceAverage)
      .filter((v): v is number => v != null);
    const medians = found
      .map((e) => e.character!.raidLogs?.medianPerformanceAverage)
      .filter((v): v is number => v != null);
    const avg = (values: number[]) =>
      values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    const roleCount = (role: string) => found.filter((e) => e.role === role).length;
    const totalBosses = progs[0]?.total ?? 0;
    return {
      found: found.length,
      tanks: roleCount("TANK"),
      healers: roleCount("HEALER"),
      dps: roleCount("DPS"),
      avgIlvl: avg(ilvls),
      minIlvl: ilvls.length ? Math.min(...ilvls) : null,
      maxIlvl: ilvls.length ? Math.max(...ilvls) : null,
      avgRio: avg(rios),
      minRio: rios.length ? Math.min(...rios) : null,
      avgKills: progs.length
        ? Math.round((progs.reduce((a, p) => a + p.kills, 0) / progs.length) * 10) / 10
        : null,
      totalBosses,
      cleared: progs.filter((p) => p.total > 0 && p.kills >= p.total).length,
      progCount: progs.length,
      avgBest: avg(bests),
      avgMedian: avg(medians),
      logged: bests.length,
    };
  }, [entries, difficulty]);

  const loading = entries.length < totalCount;

  return (
    <Paper withBorder radius="md" p={0}>
      <div className={classes.summaryBar}>
        <div className={classes.summaryClip}>
          <div className={classes.summaryRow}>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Members</span>
          <span className={classes.summaryValue} style={{ color: "#e6ebf5" }}>
            {stats.found}
          </span>
          <span className={classes.summarySub}>
            {stats.tanks} tank · {stats.healers} heal · {stats.dps} dps
          </span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Avg item level</span>
          <span className={classes.summaryValue} style={{ color: "#e6ebf5" }}>
            {stats.avgIlvl ?? "-"}
          </span>
          <span className={classes.summarySub}>
            {stats.minIlvl != null ? `low ${stats.minIlvl} · high ${stats.maxIlvl}` : ""}
          </span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Avg RIO</span>
          <span className={classes.summaryValue} style={{ color: "#e6ebf5" }}>
            {stats.avgRio?.toLocaleString() ?? "-"}
          </span>
          <span className={classes.summarySub}>
            {stats.minRio != null ? `low ${stats.minRio.toLocaleString()}` : ""}
          </span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Raid prog</span>
          <span className={classes.summaryValue} style={{ color: DIFF_COLOR[difficulty] }}>
            {stats.avgKills != null
              ? `${stats.avgKills}/${stats.totalBosses} ${DIFF_LETTER[difficulty]}`
              : "-"}
          </span>
          <span className={classes.summarySub}>
            {stats.progCount ? `${stats.cleared} of ${stats.progCount} cleared` : ""}
          </span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Avg best %</span>
          <span
            className={classes.summaryValue}
            style={{ color: stats.avgBest != null ? getParseColor(stats.avgBest) : "var(--mantine-color-dark-2)" }}
          >
            {stats.avgBest ?? "-"}
          </span>
          <span className={classes.summarySub}>{stats.logged} logged</span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Avg median %</span>
          <span
            className={classes.summaryValue}
            style={{
              color: stats.avgMedian != null ? getParseColor(stats.avgMedian) : "var(--mantine-color-dark-2)",
            }}
          >
            {stats.avgMedian ?? "-"}
          </span>
          <span className={classes.summarySub}>{stats.logged} logged</span>
        </div>
        <div className={classes.summaryCell}>
          <span className={classes.summaryLabel}>Composition</span>
          <Group gap={12} align="flex-start">
            {(
              [
                ["TANK", stats.tanks, "tank"],
                ["HEALER", stats.healers, "heal"],
                ["DPS", stats.dps, "dps"],
              ] as const
            ).map(([role, count, short]) => (
              // Number and its label share a column so they always line up.
              <div key={role} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className={classes.summaryValue} style={{ color: ROLE_COLORS[role] }}>
                  {count}
                </span>
                <span className={classes.summarySub}>{short}</span>
              </div>
            ))}
          </Group>
        </div>
          </div>
        </div>
      </div>
      {loading && (
        <Group gap={10} px={16} pb={12} pt={0} wrap="nowrap">
          <Text size="12px" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            Fetching {entries.length} / {totalCount} characters - Blizzard, Raider.IO, Warcraft Logs
          </Text>
          <Progress value={(entries.length / Math.max(totalCount, 1)) * 100} size={4} flex={1} />
        </Group>
      )}
    </Paper>
  );
};
