import { Grid, Paper, RingProgress, Select, Stack } from "@mantine/core";
import { RaidProgressionDetail } from "../../graphql/graphql";
import { getRaidDisplayName, getRaidExpansion } from "../../data/raidZones";
import { useMemo } from "react";
import { SectionTitle } from "../ui/SectionTitle";
import classes from "./RaidProgression.module.css";

type RaidProgressionProps = {
  raidData: RaidProgressionDetail[];
  isLoading: boolean;
  selectedRaid?: string | null;
  onRaidChange?: (raid: string | null) => void;
};

const DIFFICULTY_COLORS = {
  Normal: "#22c55e",
  Heroic: "#3b82f6",
  Mythic: "#f4a50e",
} as const;

export const RaidProgression: React.FC<RaidProgressionProps> = ({
  raidData,
  isLoading,
  selectedRaid,
  onRaidChange,
}) => {
  const raidOptions = useMemo(() => {
    const groups: Record<string, { value: string; label: string }[]> = {};
    for (const raid of raidData) {
      const group =
        raid.expansion_id != null
          ? (getRaidExpansion(raid.expansion_id) ?? "Other")
          : "Other";
      (groups[group] ??= []).push({ value: raid.raid, label: getRaidDisplayName(raid.raid) });
    }
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }, [raidData]);

  const raidDataItem = useMemo(
    () => raidData.find((raid) => raid.raid === selectedRaid),
    [raidData, selectedRaid],
  );

  const total = raidDataItem?.total_bosses || 1;

  const normalKilled = !isLoading && raidDataItem?.normal_bosses_killed ? raidDataItem.normal_bosses_killed : 0;
  const heroicKilled = !isLoading && raidDataItem?.heroic_bosses_killed ? raidDataItem.heroic_bosses_killed : 0;
  const mythicKilled = !isLoading && raidDataItem?.mythic_bosses_killed ? raidDataItem.mythic_bosses_killed : 0;

  const rings = [
    { label: "Normal", killed: normalKilled, color: DIFFICULTY_COLORS.Normal },
    { label: "Heroic", killed: heroicKilled, color: DIFFICULTY_COLORS.Heroic },
    { label: "Mythic", killed: mythicKilled, color: DIFFICULTY_COLORS.Mythic },
  ];

  return (
    <Stack w="100%" gap={0}>
      <SectionTitle
        right={
          <Select
            comboboxProps={{ transitionProps: { transition: "pop", duration: 200 }, width: "auto" }}
            w="auto"
            value={selectedRaid}
            data={raidOptions}
            onChange={onRaidChange}
          />
        }
        noWrap
      >
        Raid Progression
      </SectionTitle>

      <Grid>
        {rings.map(({ label, killed, color }) => {
          const pct = Math.round((killed / total) * 100);
          return (
            <Grid.Col key={label} span={{ base: 12, sm: 4 }} pb={0}>
              <Paper withBorder shadow="sm" className={classes.ringCard}>
                <RingProgress
                  transitionDuration={500}
                  size={76}
                  thickness={6}
                  label={
                    <span
                      style={{
                        fontFamily: "Space Grotesk, system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "block",
                        textAlign: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      {raidDataItem ? `${killed}/${raidDataItem.total_bosses}` : "0/0"}
                    </span>
                  }
                  sections={[{ value: (killed / total) * 100, color }]}
                />
                <div className={classes.ringMeta}>
                  <span className={classes.diffLabel} style={{ color }}>
                    {label}
                  </span>
                  <span className={classes.pctLabel}>{pct}% cleared</span>
                </div>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
    </Stack>
  );
};
