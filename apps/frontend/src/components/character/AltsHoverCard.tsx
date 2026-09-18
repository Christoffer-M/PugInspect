import {
  Group,
  Stack,
  Image,
  Text,
  UnstyledButton,
  Box,
  HoverCard,
  Badge,
  Divider,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import classes from "./AltsHoverCard.module.css";
import { normalizeRealm, upperCaseFirstLetter } from "../../util/util";
import { DEFAULT_RAID, RAIDS, RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import { RoleType } from "../../graphql/graphql";
import type { AltInfo } from "../../queries/character-info";

const sortAlts = (alts: AltInfo[]): AltInfo[] =>
  [...alts].sort((a, b) => {
    const aScore = a.mythicPlus?.currentSeason?.rating ?? 0;
    const bScore = b.mythicPlus?.currentSeason?.rating ?? 0;
    if (aScore !== bScore) return bScore - aScore;

    const aRaid = a.raidProgression?.find((r) => r.raid === DEFAULT_RAID);
    const bRaid = b.raidProgression?.find((r) => r.raid === DEFAULT_RAID);

    const aMythic = aRaid?.mythic ?? 0;
    const bMythic = bRaid?.mythic ?? 0;
    if (aMythic !== bMythic) return bMythic - aMythic;

    const aHeroic = aRaid?.heroic ?? 0;
    const bHeroic = bRaid?.heroic ?? 0;
    if (aHeroic !== bHeroic) return bHeroic - aHeroic;

    return (bRaid?.normal ?? 0) - (aRaid?.normal ?? 0);
  });

const RaidProgression: React.FC<{ alt: AltInfo }> = ({ alt }) => {
  const prog = alt.raidProgression?.find((r) => r.raid === DEFAULT_RAID);
  if (!prog) return null;
  const total = RAIDS[DEFAULT_RAID]?.bosses;
  return (
    <Group gap={6}>
      <Text size="xs" style={{ color: RAID_DIFFICULTY_COLORS.normal }}>
        {prog.normal}/{total}N
      </Text>
      <Text size="xs" style={{ color: RAID_DIFFICULTY_COLORS.heroic }}>
        {prog.heroic}/{total}H
      </Text>
      <Text size="xs" style={{ color: RAID_DIFFICULTY_COLORS.mythic }}>
        {prog.mythic}/{total}M
      </Text>
    </Group>
  );
};

export const AltsHoverCard: React.FC<{ alts: AltInfo[] }> = ({ alts }) => {
  const navigate = useNavigate();
  const sorted = sortAlts(alts);

  if (sorted.length === 0) return null;

  return (
    <HoverCard width={280} shadow="md" withArrow openDelay={150} closeDelay={100}>
      <HoverCard.Target>
        <Badge mt={4} variant="outline" color="accent" size="sm" className={classes.badge}>
          {sorted.length} known alt{sorted.length !== 1 ? "s" : ""}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown p={0} className={classes.dropdown}>
        <Stack gap={0}>
          {sorted.map((alt, i) => (
            <Box key={`${alt.region}-${alt.realm}-${alt.name}`}>
              {i > 0 && <Divider />}
              <UnstyledButton
                w="100%"
                p="xs"
                onClick={() =>
                  navigate({
                    to: "/$region/$realm/$name",
                    params: {
                      region: alt.region.toLowerCase(),
                      realm: normalizeRealm(alt.realm),
                      name: alt.name.toLowerCase(),
                    },
                    search: { roleType: RoleType.Any },
                  })
                }
                className={classes.altRow}
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Group gap="xs" wrap="nowrap">
                    <Image
                      src={alt.avatarUrl ?? undefined}
                      alt={alt.name}
                      w={32}
                      h={32}
                      radius="xl"
                      style={{ flexShrink: 0 }}
                      fallbackSrc="https://placehold.co/32x32?text=?"
                    />
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>
                        {upperCaseFirstLetter(alt.name)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {alt.itemLevel != null ? `${Math.round(alt.itemLevel)} ilvl` : "–"}
                      </Text>
                    </Stack>
                  </Group>
                  <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                    {alt.mythicPlus?.currentSeason && (
                      <Text size="xs" style={{ color: alt.mythicPlus.currentSeason.color ?? undefined }}>
                        {Math.round(alt.mythicPlus.currentSeason.rating)} M+
                      </Text>
                    )}
                    <RaidProgression alt={alt} />
                  </Stack>
                </Group>
              </UnstyledButton>
            </Box>
          ))}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
