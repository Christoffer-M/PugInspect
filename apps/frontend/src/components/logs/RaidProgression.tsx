import { Grid, Paper, RingProgress, Select, Stack, Text } from "@mantine/core";
import { RaidProgress } from "../../graphql/graphql";
import { getRaidExpansion, RAIDS } from "../../data/raidZones";
import { useMemo } from "react";
import { SectionTitle } from "@repo/ui";
import classes from "./RaidProgression.module.css";

// Options come straight from the generated RAIDS map (release order, newest
// first) — independent of the character's progression, which only has entries
// for raids with a kill.
const RAID_OPTIONS = (() => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  for (const [slug, raid] of Object.entries(RAIDS)) {
    const group = getRaidExpansion(raid.expansion) ?? "Other";
    (groups[group] ??= []).push({ value: slug, label: raid.displayName });
  }
  return Object.entries(groups).map(([group, items]) => ({ group, items }));
})();

type RaidProgressionProps = {
  raidData: RaidProgress[];
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

  // Undefined for a raid Blizzard doesn't report progression for (listed for
  // its logs only) — show that honestly rather than as 0 kills.
  const bosses = selectedRaid ? RAIDS[selectedRaid]?.bosses : undefined;

  const normalKilled = !isLoading ? (raidDataItem?.normal ?? 0) : 0;
  const heroicKilled = !isLoading ? (raidDataItem?.heroic ?? 0) : 0;
  const mythicKilled = !isLoading ? (raidDataItem?.mythic ?? 0) : 0;

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
          const pct = bosses ? Math.round((killed / bosses) * 100) : 0;
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
                      {bosses ? `${killed}/${bosses}` : "—"}
                    </Text>
                  }
                  sections={[{ value: pct, color }]}
                />
                <Stack className={classes.ringMeta} gap={2}>
                  <Text className={classes.diffLabel} m={0} style={{ color }}>
                    {label}
                  </Text>
                  <Text className={classes.pctLabel} m={0}>
                    {bosses ? `${pct}% cleared` : "Not tracked"}
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
