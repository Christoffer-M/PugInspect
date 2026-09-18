import { Paper, Skeleton, Stack, Text, Image, Box, Group } from "@mantine/core";
import { upperCaseFirstLetter, getClassColor, getParseColor } from "../../util/util";
import { AltsHoverCard } from "./AltsHoverCard";
import { MythicPlus, MythicPlusRun, MythicPlusSeason, RaidProgress } from "../../graphql/graphql";
import type { CharacterInfo } from "../../queries/character-info";
import { DEFAULT_RAID, RAIDS, RAID_DIFFICULTY_COLORS } from "../../data/raidZones";
import classes from "./CharacterHeader.module.css";

const DIMMED = "var(--mantine-color-dimmed)";

/** Rating and colour for a season, or null below 100 (a key or two, not worth showing). */
function seasonRating(season: MythicPlusSeason | null | undefined): { rating: number; color: string } | null {
  if (!season || season.rating < 100) return null;
  // No colour for an ended season — Blizzard drops it
  return { rating: season.rating, color: season.color ?? getParseColor(season.rating / 40) };
}

/** Season slugs look like "season-mn-2"; the trailing number is the season. */
function formatSeasonLabel(slug: string | null | undefined): string | null {
  const n = slug?.match(/(\d+)$/)?.[1];
  return n ? `S${n}` : null;
}

/** Highest *timed* best-run key level. Best runs are one per dungeon ranked by
 * rating, so a depleted key can sit in there — skip those to keep the "timed"
 * label honest. Kept in sync with topTimedKey in backend seo/progress.ts. */
function getTopKeyLevel(season: MythicPlusSeason | null | undefined): number | null {
  const levels = season?.bestRuns.filter((r) => r.upgrades > 0).map((r) => r.keyLevel) ?? [];
  return levels.length ? Math.max(...levels) : null;
}

/** Days since the most recent M+ run, or null if none. */
function getLastActiveDays(runs: MythicPlusRun[]): number | null {
  if (!runs.length) return null;
  const latest = Math.max(...runs.map((r) => new Date(r.completedAt).getTime()));
  if (!isFinite(latest)) return null;
  return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
}

function formatLastActive(days: number): string {
  if (days <= 0) return "Today";
  if (days <= 30) return `${days}d`;
  if (days <= 364) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 365)}y`;
}

function getLastActiveColor(days: number): string {
  if (days <= 7) return RAID_DIFFICULTY_COLORS.normal;
  if (days <= 30) return RAID_DIFFICULTY_COLORS.mythic;
  return DIMMED;
}

// RAIDS is newest-first. Previous tier = the nearest older tracked raid with
// more than one boss — single-boss mid-tier raids (Sporefall) aren't what
// people compare against, and a logs-only raid has no progression to show.
const PREVIOUS_RAID = Object.keys(RAIDS)
  .slice(Object.keys(RAIDS).indexOf(DEFAULT_RAID) + 1)
  .find((slug) => (RAIDS[slug]?.bosses ?? 0) > 1);

/** Raid progression summary for a tier, e.g. "4/8 M"; "—" without a kill.
 * Kept in sync with currentRaidProgress in backend seo/progress.ts. */
function getRaidProgressSummary(progression: RaidProgress[] | null | undefined, raid: string | undefined): string | null {
  if (!progression || !raid) return null;
  const kills = progression.find((p) => p.raid === raid);
  const total = RAIDS[raid]?.bosses ?? 0;
  if (kills?.mythic) return `${kills.mythic}/${total} M`;
  if (kills?.heroic) return `${kills.heroic}/${total} H`;
  if (kills?.normal) return `${kills.normal}/${total} N`;
  return "—";
}

function getRaidProgressColor(summary: string | null): string {
  if (summary?.endsWith("M")) return RAID_DIFFICULTY_COLORS.mythic;
  if (summary?.endsWith("H")) return RAID_DIFFICULTY_COLORS.heroic;
  if (summary?.endsWith("N")) return RAID_DIFFICULTY_COLORS.normal;
  return DIMMED;
}

/** Loading placeholder shaped like a loaded stat: value + inline sub-label, and
 * optionally the previous-season row, so the strip doesn't widen when data lands.
 * Widths measured from a typical loaded header. */
function StatSkeleton({ valueW, subW, withPrev }: { valueW: number; subW: number; withPrev?: boolean }) {
  return (
    <>
      <Group className={classes.scoreRow} gap={6} align="flex-end" wrap="nowrap" mt={2}>
        <Skeleton h={24} w={valueW} />
        <Skeleton h={10} w={subW} mb={3} />
      </Group>
      {withPrev && (
        <Group className={`${classes.prevSeason} ${classes.scoreRow}`} gap={6} align="center" wrap="nowrap">
          <Skeleton h={13} w={39} my={2} />
          <Skeleton h={10} w={subW + 4} />
        </Group>
      )}
    </>
  );
}

export const CharacterHeader: React.FC<{
  name: string;
  characterInfo: CharacterInfo | undefined | null;
  mythicPlus: MythicPlus | undefined | null;
  raidProgression: RaidProgress[] | undefined | null;
  /** From Raider.IO; only sharpens "last active", so it may arrive later. */
  recentRuns: MythicPlusRun[] | undefined;
  isLoadingInfo: boolean;
  isLoadingProgression: boolean;
  isError: boolean;
  bestParseAverage?: number | null;
  bestParseSource?: string;
  isLoadingBestParse?: boolean;
}> = ({ name, characterInfo, mythicPlus, raidProgression, recentRuns, isLoadingInfo, isLoadingProgression, isError, bestParseAverage, bestParseSource, isLoadingBestParse }) => {
  const classColor = getClassColor(characterInfo?.class);
  const { currentSeason, previousSeason } = mythicPlus ?? {};
  const rating = seasonRating(currentSeason);
  const prevRating = seasonRating(previousSeason);
  const seasonLabel = formatSeasonLabel(currentSeason?.season);
  const prevSeasonLabel = formatSeasonLabel(previousSeason?.season);
  const topKey = getTopKeyLevel(currentSeason);
  const prevTopKey = getTopKeyLevel(previousSeason);
  const raidProgress = getRaidProgressSummary(raidProgression, DEFAULT_RAID);
  const prevRaidProgress = getRaidProgressSummary(raidProgression, PREVIOUS_RAID);
  const lastActiveDays = getLastActiveDays([...(recentRuns ?? []), ...(currentSeason?.bestRuns ?? [])]);

  return (
    <Paper
      shadow="xs"
      radius="md"
      p="md"
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
          <Skeleton h={72} w={72} radius="xl" animate={!isError} />
        ) : characterInfo ? (
          <Box className={classes.avatarRing}>
            <Image
              src={characterInfo.avatarUrl}
              alt={name}
              h={68}
              w={68}
              fit="cover"
              radius={100}
              fallbackSrc="https://placehold.co/68x68?text=?"
            />
          </Box>
        ) : null}

        {/* Identity */}
        {isLoadingInfo || isError ? (
          // Mirrors the loaded block line-for-line (name ≈32.5px, sm lines ≈20.3px).
          // No alts pill placeholder: most characters have no linked alts.
          <Stack gap={1}>
            <Skeleton h={22} w={180} my={5} animate={!isError} />
            <Skeleton h={14} w={140} my={3} animate={!isError} />
            <Skeleton h={14} w={160} my={3} animate={!isError} />
            <Skeleton h={14} w={130} my={3} animate={!isError} />
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
              {characterInfo.potentialAlts.length > 0 && (
                <Group mt={4}>
                  <AltsHoverCard alts={characterInfo.potentialAlts} />
                </Group>
              )}
            </Stack>
          )
        )}

        {/* Stat Strip */}
        <Box className={classes.statstrip}>
          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>M+ Rating</Text>
            {isLoadingProgression ? (
              <StatSkeleton valueW={54} subW={62} withPrev />
            ) : (
              <Group className={classes.scoreRow} gap={6} align="baseline" wrap="nowrap">
                <Text
                  className={classes.statVal}
                  m={0}
                  style={{ color: rating?.color ?? DIMMED }}
                >
                  {rating ? Math.round(rating.rating).toLocaleString() : "—"}
                </Text>
                {/* Only worth tagging the score as "current" when a previous
                    season sits under it to contrast against. */}
                {prevRating && (
                  <Text className={classes.statSub} m={0}>
                    current{seasonLabel ? ` (${seasonLabel})` : ""}
                  </Text>
                )}
              </Group>
            )}
            {!isLoadingProgression && prevRating && (
              <Group
                className={`${classes.prevSeason} ${classes.scoreRow}`}
                gap={6}
                align="baseline"
                wrap="nowrap"
              >
                <Text
                  className={classes.prevSeasonVal}
                  m={0}
                  style={{ color: prevRating.color }}
                >
                  {Math.round(prevRating.rating).toLocaleString()}
                </Text>
                <Text className={classes.statSub} m={0}>
                  previous{prevSeasonLabel ? ` (${prevSeasonLabel})` : ""}
                </Text>
              </Group>
            )}
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Top Key</Text>
            {isLoadingProgression ? (
              <StatSkeleton valueW={31} subW={29} />
            ) : (
              <Group className={classes.scoreRow} gap={6} align="baseline" wrap="nowrap">
                <Text className={classes.statVal} m={0} style={{ color: "var(--mantine-color-text)" }}>
                  {topKey != null ? (
                    <><Text component="span" className={classes.statValSmall}>+</Text>{topKey}</>
                  ) : "—"}
                </Text>
                <Text className={classes.statSub} m={0}>
                  {prevTopKey != null ? `current${seasonLabel ? ` (${seasonLabel})` : ""}` : "timed"}
                </Text>
              </Group>
            )}
            {!isLoadingProgression && prevTopKey != null && (
              <Group className={`${classes.prevSeason} ${classes.scoreRow}`} gap={6} align="baseline" wrap="nowrap">
                <Text className={classes.prevSeasonVal} m={0}>
                  +{prevTopKey}
                </Text>
                <Text className={classes.statSub} m={0}>
                  previous{prevSeasonLabel ? ` (${prevSeasonLabel})` : ""}
                </Text>
              </Group>
            )}
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Raid Prog</Text>
            {isLoadingProgression ? (
              <StatSkeleton valueW={52} subW={58} withPrev />
            ) : (
              <Group className={classes.scoreRow} gap={6} align="baseline" wrap="nowrap">
                <Text
                  className={classes.statVal}
                  m={0}
                  style={{ color: getRaidProgressColor(raidProgress) }}
                >
                  {raidProgress ?? "—"}
                </Text>
                <Text className={classes.statSub} m={0}>current tier</Text>
              </Group>
            )}
            {!isLoadingProgression && prevRaidProgress && prevRaidProgress !== "—" && (
              <Group className={`${classes.prevSeason} ${classes.scoreRow}`} gap={6} align="baseline" wrap="nowrap">
                <Text
                  className={classes.prevSeasonVal}
                  m={0}
                  style={{ color: getRaidProgressColor(prevRaidProgress) }}
                >
                  {prevRaidProgress}
                </Text>
                <Text className={classes.statSub} m={0}>previous tier</Text>
              </Group>
            )}
          </Stack>

          <Stack className={classes.stat} gap={3}>
            <Text className={classes.statLabel} m={0}>Last Active</Text>
            {isLoadingProgression ? (
              <Skeleton h={24} w={70} mt={2} />
            ) : (
              <Text
                className={classes.statVal}
                m={0}
                style={{
                  color: lastActiveDays != null ? getLastActiveColor(lastActiveDays) : DIMMED,
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
                <Skeleton h={24} w={56} mt={2} />
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
        </Box>
      </Box>
    </Paper>
  );
};
