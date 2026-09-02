import { Grid, Paper, RingProgress, Select, Stack, Text } from "@mantine/core";
import { RaidProgressionDetail } from "../../graphql/graphql";
import { getRaidExpansion, RAIDS } from "../../data/raidZones";
import { useMemo } from "react";
import { SectionTitle } from "@repo/ui";
import classes from "./RaidProgression.module.css";

// Options come straight from the generated RAIDS map (release order, newest
// first) — independent of the character's raid_progression data, which is
// only used for the selected raid's kill counts.
const RAID_OPTIONS = (() => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  for (const [slug, raid] of Object.entries(RAIDS)) {
    const group = getRaidExpansion(raid.expansion) ?? "Other";
    (groups[group] ??= []).push({ value: slug, label: raid.displayName });
  }
  return Object.entries(groups).map(([group, items]) => ({ group, items }));
})();

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
  const raidDataItem = useMemo(
    () => raidData.find((raid) => raid.raid === selectedRaid),
    [raidData, selectedRaid],
  );

  const total = raidDataItem?.total_bosses || 1;

  const normalKilled =
    !isLoading && raidDataItem?.normal_bosses_killed
      ? raidDataItem.normal_bosses_killed
      : 0;
  const heroicKilled =
    !isLoading && raidDataItem?.heroic_bosses_killed
      ? raidDataItem.heroic_bosses_killed
      : 0;
  const mythicKilled =
    !isLoading && raidDataItem?.mythic_bosses_killed
      ? raidDataItem.mythic_bosses_killed
      : 0;

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
            comboboxProps={{
              transitionProps: { transition: "pop", duration: 200 },
              width: "auto",
            }}
            w="auto"
            value={selectedRaid}
            data={RAID_OPTIONS}
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
                    <Text
                      fw={700}
                      fz={13}
                      ta="center"
                      lh={1.2}
                      ff="Space Grotesk, system-ui, sans-serif"
                    >
                      {raidDataItem
                        ? `${killed}/${raidDataItem.total_bosses}`
                        : "0/0"}
                    </Text>
                  }
                  sections={[{ value: (killed / total) * 100, color }]}
                />
                <Stack className={classes.ringMeta} gap={2}>
                  <Text className={classes.diffLabel} m={0} style={{ color }}>
                    {label}
                  </Text>
                  <Text className={classes.pctLabel} m={0}>
                    {pct}% cleared
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
    </Stack>
  );
};
