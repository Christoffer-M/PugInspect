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
import { RankingGroup } from "./RankingGroup";
import RaiderIoIocn from "../assets/raiderio-icon.svg";
import WarcraftLogsIcon from "../assets/warcraftlogs-icon.svg";
import { ExternalLinkIcon } from "./ExternalLinkIcon";
import { Character } from "../graphql/graphql";

export const CharacterHeader: React.FC<{
  name: string;
  region: string;
  server: string;
  data: Character | undefined | null;
  loading: boolean;
  isError: boolean;
}> = ({ name, region, server, data, loading, isError }) => {
  const raiderIoInfo = data?.raiderIo;
  const scores = [
    {
      role: "Tank",
      score: raiderIoInfo?.tank?.score,
      color: raiderIoInfo?.tank?.color,
    },
    {
      role: "Healer",
      score: raiderIoInfo?.healer?.score,
      color: raiderIoInfo?.healer?.color,
    },
    {
      role: "DPS",
      score: raiderIoInfo?.dps?.score,
      color: raiderIoInfo?.dps?.color,
    },
  ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
      <Group justify="space-between" align="flex-start">
        <Group h="100%" align="flex-start">
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

                  <Text size="sm">
                    {raiderIoInfo.race} {raiderIoInfo.specialization}{" "}
                    {raiderIoInfo.class}
                  </Text>
                </Stack>
              </>
            )
          )}
        </Group>

        <Stack gap={4}>
          {scores.map((score, index) => {
            const isScoreBelowThreshold = (score?.score ?? 0) < 100;
            if (isScoreBelowThreshold) {
              return null;
            }
            return (
              score && (
                <RankingGroup
                  key={index}
                  label={`RIO Score (${score.role}):`}
                  value={score.score}
                  color={score.color}
                  isLoading={loading}
                />
              )
            );
          })}

          <RankingGroup
            label="Item level:"
            value={raiderIoInfo?.itlvl?.toFixed(2)}
            color={undefined}
            isLoading={loading}
          />
        </Stack>
      </Group>
    </Paper>
  );
};
