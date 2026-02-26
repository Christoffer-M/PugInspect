import {
  Center,
  Grid,
  Group,
  Paper,
  RingProgress,
  Select,
  Stack,
  Title,
} from "@mantine/core";
import { RaidProgressionDetail } from "../graphql/graphql";
import { useState, useMemo, useEffect } from "react";

const TextMapper: Record<string, string> = {
  "manaforge-omega": "Manaforge Omega",
  "liberation-of-undermine": "Liberation of Undermine",
  "blackrock-depths": "Blackrock Depths",
  "nerubar-palace": "Nerub-ar Palace",
};

type RaidProgressionProps = {
  raidData: RaidProgressionDetail[];
  isLoading: boolean;
  onRaidChange?: (raid: string | null) => void;
};

export const RaidProgression: React.FC<RaidProgressionProps> = ({
  raidData,
  isLoading,
  onRaidChange,
}) => {
  const defaultValue = raidData[0]?.raid ?? null;
  const [selectedRaid, setSelectedRaid] = useState<string | null>(defaultValue);

  const raidOptions = useMemo(
    () =>
      raidData.map((raid) => ({
        value: raid.raid,
        label: TextMapper[raid.raid] || raid.raid,
      })) ?? [],
    [raidData],
  );

  const raidDataItem = useMemo(
    () => raidData.find((raid) => raid.raid === selectedRaid),
    [raidData, selectedRaid],
  );

  useEffect(() => {
    if (raidData.length > 0 && !selectedRaid) {
      setSelectedRaid(defaultValue);
    }
  }, [raidData]);

  const handleOnChange = (raid: string | null) => {
    setSelectedRaid(raid);
    if (onRaidChange) {
      onRaidChange(raid);
    }
  }

  const normalBossesKilled =
    !isLoading && raidDataItem?.normal_bosses_killed
      ? raidDataItem.normal_bosses_killed
      : 0;

  const heroicBossesKilled =
    !isLoading && raidDataItem?.heroic_bosses_killed
      ? raidDataItem.heroic_bosses_killed
      : 0;

  const mythicBossesKilled =
    !isLoading && raidDataItem?.mythic_bosses_killed
      ? raidDataItem.mythic_bosses_killed
      : 0;

  return (
    <Stack w={"100%"} gap={0}>
      <Group justify="space-between" m={0}>
        <Title order={2} m={0}>
          Raid Progression
        </Title>
        <Select
          comboboxProps={{
            transitionProps: { transition: "pop", duration: 200 },
          }}
          value={selectedRaid}
          data={raidOptions}
          onChange={handleOnChange}
          defaultValue={defaultValue}
          style={{ width: 200 }}
        />
      </Group>

      <Grid>
        <Grid.Col span={4} pb={0}>
          <Paper withBorder p={0} shadow="sm" style={{ textAlign: "center" }}>
            <Center>
              <RingProgress
                transitionDuration={500}
                size={140}
                label={
                  <Title order={4}>
                    {raidDataItem
                      ? `${normalBossesKilled} / ${raidDataItem.total_bosses} N`
                      : "0/0 N"}
                  </Title>
                }
                sections={[
                  {
                    value:
                      ((normalBossesKilled || 0) /
                        (raidDataItem?.total_bosses || 1)) *
                      100,
                    color: "green",
                  },
                ]}
              />
            </Center>
          </Paper>
        </Grid.Col>
        <Grid.Col span={4} pb={0}>
          <Paper withBorder p={0} shadow="sm" style={{ textAlign: "center" }}>
            <Center>
              <RingProgress
                transitionDuration={500}
                size={140}
                label={
                  <Title order={4}>
                    {raidDataItem
                      ? `${heroicBossesKilled} / ${raidDataItem.total_bosses} H`
                      : "0/0 H"}
                  </Title>
                }
                sections={[
                  {
                    value:
                      ((heroicBossesKilled || 0) /
                        (raidDataItem?.total_bosses || 1)) *
                      100,
                    color: "blue",
                  },
                ]}
              />
            </Center>
          </Paper>
        </Grid.Col>
        <Grid.Col span={4} pb={0}>
          <Paper withBorder p={0} shadow="sm" style={{ textAlign: "center" }}>
            <Center>
              <RingProgress
                transitionDuration={500}
                size={140}
                label={
                  <Title order={4}>
                    {raidDataItem
                      ? `${mythicBossesKilled} / ${raidDataItem.total_bosses} M`
                      : "0/0 M"}
                  </Title>
                }
                sections={[
                  {
                    value:
                      ((mythicBossesKilled || 0) /
                        (raidDataItem?.total_bosses || 1)) *
                      100,
                    color: "yellow",
                  },
                ]}
              />
            </Center>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
