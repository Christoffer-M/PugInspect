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
import RaiderIoIocn from "../assets/raiderio-icon.svg";
import WarcraftLogsIcon from "../assets/warcraftlogs-icon.svg";
import { ExternalLinkIcon } from "./ExternalLinkIcon";
import { Character, Maybe, SeasonScores } from "../graphql/graphql";

const createSeasonScoreMap = (seasonData: Maybe<SeasonScores> | undefined) => {
  if (!seasonData) return [];

  return [
    {
      role: "Tank",
      score: seasonData?.tank?.score,
      color: seasonData?.tank?.color,
    },
    {
      role: "Healer",
      score: seasonData?.healer?.score,
      color: seasonData?.healer?.color,
    },
    {
      role: "DPS",
      score: seasonData?.dps?.score,
      color: seasonData?.dps?.color,
    },
  ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
};

export const CharacterHeader: React.FC<{
  name: string;
  region: string;
  server: string;
  data: Character | undefined | null;
  loading: boolean;
  isError: boolean;
}> = ({ name, region, server, data, loading, isError }) => {
  const raiderIoInfo = data?.raiderIo;
  const previousSeasonScore = createSeasonScoreMap(raiderIoInfo?.previousSeason);
  const currentSeasonScores = createSeasonScoreMap(raiderIoInfo?.currentSeason);

  const hasValidCurrentSeasonScore = currentSeasonScores.some(score => score.score !== undefined && score.score >= 100);
  const hasValidPreviousSeasonScore = previousSeasonScore.some(score => score.score !== undefined && score.score >= 100);

  return (
    <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group h="100%" align="flex-start" style={{ flex: 1, minWidth: 200 }}>
          {loading || isError ? (
            <>
              <Skeleton h={85} w={85} radius={100} m={0} animate={!isError} />
              <Stack gap={"xs"}>
                <Skeleton height={20} width={200} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
              </Stack>
            </>
          ) : (
            raiderIoInfo && (
              <>
                <Image
                  src={raiderIoInfo.thumbnailUrl}
                  alt={name}
                  h={85}
                  w={85}
                  fit="contain"
                  radius={100}
                  m={0}
                  fallbackSrc={`https://placehold.co/85x85?text=No+Image`}
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
                      {upperCaseFirstLetter(data?.name || name)}
                    </Title>
                    <ExternalLinkIcon
                      href={`https://raider.io/characters/${region}/${server}/${name}`}
                      icon={RaiderIoIocn}
                      size={22}
                    />

                    <ExternalLinkIcon
                      href={`https://www.warcraftlogs.com/character/${region}/${server}/${name}`}
                      icon={WarcraftLogsIcon}
                      size={22}
                    />
                  </Group>

                  <Text size="sm" m={0}>
                    ({data.region.toUpperCase()}) {data.realm}
                  </Text>

                  <Text size="sm" m={0}>
                    {raiderIoInfo.race} {raiderIoInfo.specialization}{" "}
                    {raiderIoInfo.class}
                  </Text>

                  <Text size="sm" m={0}>
                    <b>Item Level:</b> {raiderIoInfo.itlvl ? raiderIoInfo.itlvl.toFixed(2) : "-"}
                  </Text>

                </Stack>
              </>
            )
          )}
        </Group>

        <Stack gap={8} align="flex-start" >
          <Text size="md" m={0} fw={700}>
            Raider.IO Score
          </Text>
          <Group align="flex-start" gap={50}>


            <Stack gap={2}>
              <Text size="xs" m={0} fw={700}>
                Current Season
              </Text>
              <Skeleton visible={loading} animate>
                {hasValidCurrentSeasonScore ? null : (
                  <Text size="xs" m={0} c="dimmed">
                    No valid scores
                  </Text>
                )}

                {currentSeasonScores.map((score, index) => {
                  const isBelowThreshold = score.score !== undefined && score.score < 100;
                  if (isBelowThreshold) {
                    return null
                  }
                  return (
                    score && (
                      <RioScore
                        key={index}
                        label={`(${score.role})`}
                        value={score.score}
                        color={score.color}
                        isLoading={loading}
                      />
                    )
                  );
                })}

              </Skeleton>


            </Stack>

            <Stack gap={2}>
              <Text size="xs" m={0} fw={700}>
                Previous Season
              </Text>
              <Skeleton visible={loading} animate>
                {hasValidPreviousSeasonScore ? null : (
                  <Text size="xs" m={0} c="dimmed">
                    No valid scores
                  </Text>
                )}
                <Stack align="flex-start" gap={50}>
                  {previousSeasonScore.map((score, index) => {
                    const isBelowThreshold = score.score !== undefined && score.score < 100;
                    if (isBelowThreshold) {
                      return null
                    }

                    return (
                      score && (
                        <RioScore
                          key={index}
                          label={`(${score.role})`}
                          value={score.score}
                          color={score.color}
                          isLoading={loading}
                        />
                      )
                    );
                  })}
                </Stack>

              </Skeleton>



            </Stack>
          </Group>
        </Stack>


      </Group>
    </Paper>
  );
};
