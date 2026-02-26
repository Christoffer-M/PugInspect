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
import { getRaidDisplayName } from "../data/raidZones";
import { useMemo, useEffect } from "react";

type RaidProgressionProps = {
  raidData: RaidProgressionDetail[];
  isLoading: boolean;
  selectedRaid?: string | null;
  onRaidChange?: (raid: string | null) => void;
};

export const RaidProgression: React.FC<RaidProgressionProps> = ({
  raidData,
  isLoading,
  selectedRaid: selectedRaidProp,
  onRaidChange,
}) => {
  const defaultValue = raidData[0]?.raid ?? null;
  const selectedRaid = selectedRaidProp ?? defaultValue;

  const raidOptions = useMemo(
    () =>
      raidData.map((raid) => ({
        value: raid.raid,
        label: getRaidDisplayName(raid.raid),
      })) ?? [],
    [raidData],
  );

  const raidDataItem = useMemo(
    () => raidData.find((raid) => raid.raid === selectedRaid),
    [raidData, selectedRaid],
  );

  useEffect(() => {
    if (raidData.length > 0 && !selectedRaid && onRaidChange) {
      onRaidChange(defaultValue);
    }
  }, [raidData]);

  const handleOnChange = (raid: string | null) => {
    onRaidChange?.(raid);
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
      <Group justify="space-between" m={0} wrap="wrap" gap="xs">
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
          maw={200}
          w="100%"
        />
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 4 }} pb={0}>
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
        <Grid.Col span={{ base: 12, sm: 4 }} pb={0}>
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
        <Grid.Col span={{ base: 12, sm: 4 }} pb={0}>
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
