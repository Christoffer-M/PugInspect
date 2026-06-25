import { Paper, Skeleton, Stack, Text, Image, Box, Group } from "@mantine/core";
import { upperCaseFirstLetter, getClassColor, getParseColor } from "../../util/util";
import { AltsHoverCard } from "./AltsHoverCard";
import { Character, RaiderIo } from "../../graphql/graphql";
import { DEFAULT_RAID, RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import classes from "./CharacterHeader.module.css";

const DIMMED = "var(--mantine-color-dimmed)";

function getTopRioScore(raiderIo: RaiderIo | null | undefined): { score: number; role: string; color: string } | null {
  const season = raiderIo?.currentSeason;
  if (!season) return null;

  const all = season.all;
  if (all?.score != null && all.score >= 100) {
    return { score: all.score, role: "All", color: all.color ?? getParseColor(all.score / 40) };
  }

  const roles = [
    { role: "DPS", data: season.dps },
    { role: "Healer", data: season.healer },
    { role: "Tank", data: season.tank },
  ]
    .filter((r) => r.data?.score != null && r.data.score >= 100)
    .sort((a, b) => (b.data?.score ?? 0) - (a.data?.score ?? 0));

  const best = roles[0];
  if (!best?.data?.score) return null;
  return { score: best.data.score, role: best.role, color: best.data.color ?? "#ff8a3d" };
}

function getTopKeyLevel(raiderIo: RaiderIo | null | undefined): number | null {
  const runs = raiderIo?.bestMythicPlusRuns;
  if (!runs?.length) return null;
  const max = Math.max(...runs.map((r) => r.key_level ?? 0));
  return max > 0 ? max : null;
}

/** Days since the most recent logged M+ run, or null if none. */
function getLastActiveDays(raiderIo: RaiderIo | null | undefined): number | null {
  const runs = [
    ...(raiderIo?.recentMythicPlusRuns ?? []),
    ...(raiderIo?.bestMythicPlusRuns ?? []),
  ];
  if (!runs.length) return null;
  const latest = Math.max(...runs.map((r) => new Date(r.completed_at).getTime()));
  if (!isFinite(latest)) return null;
  return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
}

function formatLastActive(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 30) return `${days}d ago`;
  if (days <= 89) return `${Math.floor(days / 7)}w ago`;
  return "> 3mo";
}

function getLastActiveColor(days: number): string {
  if (days <= 7) return RAID_DIFFICULTY_COLORS.normal;
  if (days <= 30) return RAID_DIFFICULTY_COLORS.mythic;
  return DIMMED;
}

/** Current-tier raid progression summary, e.g. "4/8 M".
 * Kept in sync with raidProgressSummary in backend seo/characterCard.ts. */
function getRaidProgressSummary(raiderIo: RaiderIo | null | undefined): string | null {
  const current = raiderIo?.raidProgression?.find((p) => p.raid === DEFAULT_RAID);
  if (!current) return null;
  const total = current.total_bosses ?? 0;
  const mythic = current.mythic_bosses_killed ?? 0;
  const heroic = current.heroic_bosses_killed ?? 0;
  const normal = current.normal_bosses_killed ?? 0;
  if (mythic > 0) return `${mythic}/${total} M`;
  if (heroic > 0) return `${heroic}/${total} H`;
  if (normal > 0) return `${normal}/${total} N`;
  return "—";
}

function getRaidProgressColor(summary: string | null): string {
  if (summary?.endsWith("M")) return RAID_DIFFICULTY_COLORS.mythic;
  if (summary?.endsWith("H")) return RAID_DIFFICULTY_COLORS.heroic;
  if (summary?.endsWith("N")) return RAID_DIFFICULTY_COLORS.normal;
  return DIMMED;
}

export const CharacterHeader: React.FC<{
  name: string;
  characterInfo: Character | undefined | null;
  raiderIo: RaiderIo | undefined | null;
  isLoadingInfo: boolean;
  isLoadingRaiderIo: boolean;
  isError: boolean;
  bestParseAverage?: number | null;
  bestParseSource?: string;
  isLoadingBestParse?: boolean;
}> = ({ name, characterInfo, raiderIo, isLoadingInfo, isLoadingRaiderIo, isError, bestParseAverage, bestParseSource, isLoadingBestParse }) => {
  const classColor = getClassColor(characterInfo?.class);
  const rioScore = getTopRioScore(raiderIo);
  const topKey = getTopKeyLevel(raiderIo);
  const raidProgress = getRaidProgressSummary(raiderIo);
  const lastActiveDays = getLastActiveDays(raiderIo);

  return (
    <Paper
      shadow="xs"
      radius="md"
      p="lg"
      withBorder
      w="100%"
      className={classes.card}
      style={
        {
          "--class-color": classColor,
          "--avatar-ring-color": classColor,
        } as React.CSSProperties
      }
    >
      <Box
        className={classes.accentBar}
        style={{
          background: `linear-gradient(90deg, transparent, ${classColor}, transparent)`,
        }}
      />

      <Box className={classes.profile}>
        {/* Avatar */}
        {isLoadingInfo || isError ? (
          <Skeleton h={92} w={92} radius="xl" animate={!isError} />
        ) : characterInfo ? (
          <Box className={classes.avatarRing}>
            <Image
              src={characterInfo.avatarUrl}
              alt={name}
              h={88}
              w={88}
              fit="cover"
              radius={100}
              fallbackSrc="https://placehold.co/88x88?text=?"
            />
          </Box>
        ) : null}

        {/* Identity */}
        {isLoadingInfo || isError ? (
          <Stack gap="xs">
            <Skeleton h={22} w={180} animate={!isError} />
            <Skeleton h={15} w={140} animate={!isError} />
            <Skeleton h={15} w={160} animate={!isError} />
            <Skeleton h={15} w={130} animate={!isError} />
          </Stack>
        ) : (
          characterInfo && (
            <Stack gap={1}>
              <Text className={classes.characterName} fw={700} m={0}>
                {upperCaseFirstLetter(characterInfo.name || name)}
              </Text>
              {characterInfo.guild && (
                <Text size="sm" c="dimmed" m={0}>
                  &lt;{characterInfo.guild.name}&gt;
                </Text>
              )}
              <Text size="sm" c="dimmed" m={0}>
                ({characterInfo.region.toUpperCase()}) {characterInfo.realm}
              </Text>
              <Text size="sm" c="dimmed" m={0}>
                {characterInfo.race} {characterInfo.activeSpec} {characterInfo.class}
              </Text>
              <Text size="sm" m={0}>
                <Text span fw={600} size="sm">Item Level:</Text>{" "}
                {characterInfo.equippedItemLevel != null
                  ? characterInfo.equippedItemLevel.toFixed(0)
                  : "–"}
              </Text>
              {characterInfo.potentialAlts.length > 0 && (
                <Group mt={4}>
                  <AltsHoverCard alts={characterInfo.potentialAlts} />
                </Group>
              )}
            </Stack>
          )
        )}

        {/* Stat Strip */}
        <Group className={classes.statstrip} gap={0} align="stretch">
          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>RIO Score</Text>
            {isLoadingRaiderIo ? (
              <Skeleton h={28} w={70} mt={2} />
            ) : (
              <Text
                className={classes.statVal}
                m={0}
                style={{ color: rioScore?.color ?? "var(--mantine-color-dimmed)" }}
              >
                {rioScore ? Math.round(rioScore.score).toLocaleString() : "—"}
              </Text>
            )}
            <Text className={classes.statSub} m={0}>
              {rioScore ? `${rioScore.role} · current` : "current season"}
            </Text>
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Top Key</Text>
            {isLoadingRaiderIo ? (
              <Skeleton h={28} w={50} mt={2} />
            ) : (
              <Text className={classes.statVal} m={0} style={{ color: "var(--mantine-color-text)" }}>
                {topKey != null ? (
                  <><Text component="span" className={classes.statValSmall}>+</Text>{topKey}</>
                ) : "—"}
              </Text>
            )}
            <Text className={classes.statSub} m={0}>timed</Text>
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Raid Prog</Text>
            {isLoadingRaiderIo ? (
              <Skeleton h={28} w={64} mt={2} />
            ) : (
              <Text
                className={classes.statVal}
                m={0}
                style={{ color: getRaidProgressColor(raidProgress) }}
              >
                {raidProgress ?? "—"}
              </Text>
            )}
            <Text className={classes.statSub} m={0}>current tier</Text>
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Last Active</Text>
            {isLoadingRaiderIo ? (
              <Skeleton h={28} w={70} mt={2} />
            ) : (
              <Text
                className={classes.statVal}
                m={0}
                style={{
                  color: lastActiveDays != null ? getLastActiveColor(lastActiveDays) : DIMMED,
                  fontSize: 20,
                }}
              >
                {lastActiveDays != null ? formatLastActive(lastActiveDays) : "—"}
              </Text>
            )}
            <Text className={classes.statSub} m={0}>last M+ run</Text>
          </Stack>

          {(isLoadingBestParse || bestParseAverage != null) && (
            <Stack className={classes.stat} gap={3}>
              <Text className={classes.statLabel} m={0}>Best Parse</Text>
              {isLoadingBestParse ? (
                <Skeleton h={28} w={56} mt={2} />
              ) : (
                <Text
                  className={classes.statVal}
                  m={0}
                  style={{ color: getParseColor(bestParseAverage) }}
                >
                  {bestParseAverage != null ? `${Math.round(bestParseAverage)}%` : "—"}
                </Text>
              )}
              <Text className={classes.statSub} m={0}>
                best avg{bestParseSource ? ` · ${bestParseSource}` : ""}
              </Text>
            </Stack>
          )}
        </Group>
      </Box>
    </Paper>
  );
};
