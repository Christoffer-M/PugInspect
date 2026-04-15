import {
  Paper,
  Group,
  Skeleton,
  Stack,
  Title,
  Image,
  Text,
} from "@mantine/core";
import { upperCaseFirstLetter } from "../util/util";
import { RioScore } from "./RioScore";
import { AltsHoverCard } from "./AltsHoverCard";
import { Character, Maybe, RaiderIo, SeasonScores } from "../graphql/graphql";

const createSeasonScoreMap = (seasonData: Maybe<SeasonScores> | undefined) => {
  if (!seasonData) return [];

  return [
    {
      role: "Tank",
      score: seasonData.tank?.score,
      color: seasonData.tank?.color,
    },
    {
      role: "Healer",
      score: seasonData.healer?.score,
      color: seasonData.healer?.color,
    },
    { role: "DPS", score: seasonData.dps?.score, color: seasonData.dps?.color },
  ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
};

export const CharacterHeader: React.FC<{
  name: string;
  characterInfo: Character | undefined | null;
  raiderIo: RaiderIo | undefined | null;
  isLoadingInfo: boolean;
  isLoadingRaiderIo: boolean;
  isError: boolean;
}> = ({
  name,
  characterInfo,
  raiderIo,
  isLoadingInfo,
  isLoadingRaiderIo,
  isError,
}) => {
  const previousSeasonScores = createSeasonScoreMap(raiderIo?.previousSeason);
  const currentSeasonScores = createSeasonScoreMap(raiderIo?.currentSeason);

  const hasValidCurrentSeasonScore = currentSeasonScores.some(
    (s) => s.score !== undefined && s.score >= 100,
  );
  const hasValidPreviousSeasonScore = previousSeasonScores.some(
    (s) => s.score !== undefined && s.score >= 100,
  );

  return (
    <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        {/* ── Identity (Blizzard) ── */}
        <Group h="100%" align="flex-start" style={{ flex: 1, minWidth: 200 }}>
          {isLoadingInfo || isError ? (
            <>
              <Skeleton h={85} w={85} radius={100} m={0} animate={!isError} />
              <Stack gap="xs">
                <Skeleton height={20} width={200} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
              </Stack>
            </>
          ) : (
            characterInfo && (
              <Group>
                <Image
                  src={characterInfo.avatarUrl}
                  alt={name}
                  h={100}
                  w={100}
                  fit="contain"
                  radius={100}
                  m={0}
                  fallbackSrc="https://placehold.co/100x100?text=No+Image"
                />
                <Stack
                  gap={0}
                  justify="flex-start"
                  h="100%"
                  flex={1}
                  align="flex-start"
                >
                  <Group gap="xs" justify="flex-start" align="center">
                    <Title order={3} m={0}>
                      {upperCaseFirstLetter(characterInfo.name || name)}
                    </Title>
                  </Group>
                  {characterInfo.guild && (
                    <Text size="sm" m={0}>
                      {`<${characterInfo.guild.name}>`}
                    </Text>
                  )}
                  <Text size="sm" m={0}>
                    ({characterInfo.region.toUpperCase()}) {characterInfo.realm}
                  </Text>
                  <Text size="sm" m={0}>
                    {characterInfo.race} {characterInfo.activeSpec}{" "}
                    {characterInfo.class}
                  </Text>
                  <Text size="sm" m={0}>
                    <b>Item Level:</b>{" "}
                    {characterInfo.equippedItemLevel != null
                      ? characterInfo.equippedItemLevel.toFixed(0)
                      : "-"}
                  </Text>
                  {characterInfo.potentialAlts.length > 0 && (
                    <AltsHoverCard alts={characterInfo.potentialAlts} />
                  )}
                </Stack>
              </Group>
            )
          )}
        </Group>

        {/* ── Raider.IO Scores ── */}
        <Stack gap={8} align="flex-start">
          <Text size="md" m={0} fw={700}>
            Raider.IO Score
          </Text>
          <Group align="flex-start" gap={50}>
            <Stack gap={2}>
              <Text size="xs" m={0} fw={700}>
                Current Season
              </Text>
              <Skeleton visible={isLoadingRaiderIo} animate>
                {!isLoadingRaiderIo && !hasValidCurrentSeasonScore && (
                  <Text size="xs" m={0} c="dimmed">
                    No valid scores
                  </Text>
                )}
                {currentSeasonScores.map((score, i) =>
                  score.score !== undefined && score.score < 100 ? null : (
                    <RioScore
                      key={i}
                      label={`(${score.role})`}
                      value={score.score}
                      color={score.color}
                      isLoading={isLoadingRaiderIo}
                    />
                  ),
                )}
              </Skeleton>
            </Stack>

            <Stack gap={2}>
              <Text size="xs" m={0} fw={700}>
                Previous Season
              </Text>
              <Skeleton visible={isLoadingRaiderIo} animate>
                {!isLoadingRaiderIo && !hasValidPreviousSeasonScore && (
                  <Text size="xs" m={0} c="dimmed">
                    No valid scores
                  </Text>
                )}
                {previousSeasonScores.map((score, i) =>
                  score.score !== undefined && score.score < 100 ? null : (
                    <RioScore
                      key={i}
                      label={`(${score.role})`}
                      value={score.score}
                      color={score.color}
                      isLoading={isLoadingRaiderIo}
                    />
                  ),
                )}
              </Skeleton>
            </Stack>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
};
