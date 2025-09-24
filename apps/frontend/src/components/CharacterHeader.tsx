import {
  useMantineTheme,
  Paper,
  Group,
  Skeleton,
  Stack,
  Title,
  Image,
  Text,
} from "@mantine/core";
import {
  GetWarcraftLogRankingColors,
  upperCaseFirstLetter,
} from "../util/util";
import { RankingGroup } from "./RankingGroup";
import RaiderIoIocn from "../../icons/raiderio-icon.svg";
import WarcraftLogsIcon from "../../icons/warcraftlogs-icon.svg";
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
  const theme = useMantineTheme();

  const logs = data?.warcraftLogs;
  const raiderIoInfo = data?.raiderIo;
  const medianPerformance = logs?.medianPerformanceAverage;
  const bestPerformance = logs?.bestPerformanceAverage;

  return (
    <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
      <Group justify="space-between">
        <Group h="100%">
          {loading ? (
            <>
              <Skeleton h={85} w={85} radius={100} m={0} animate={!isError} />
              <Stack gap={"xs"}>
                <Skeleton height={20} width={200} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
                <Skeleton height={16} width={160} animate={!isError} />
              </Stack>
            </>
          ) : (
            raiderIoInfo &&
            !isError && (
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
                    {raiderIoInfo.race} - {raiderIoInfo.class}
                  </Text>
                </Stack>
              </>
            )
          )}
        </Group>

        <Stack align="flex-end" gap={0}>
          <RankingGroup
            label="RIO score:"
            value={raiderIoInfo?.all?.score}
            color={raiderIoInfo?.all?.color}
            isLoading={loading}
          />
          <RankingGroup
            label="Best avg. log:"
            value={bestPerformance}
            color={
              bestPerformance
                ? GetWarcraftLogRankingColors(bestPerformance, theme)
                : undefined
            }
            isLoading={loading}
          />
          <RankingGroup
            label="Med. avg. log:"
            value={medianPerformance}
            color={
              medianPerformance
                ? GetWarcraftLogRankingColors(medianPerformance, theme)
                : undefined
            }
            isLoading={loading}
          />
        </Stack>
      </Group>
    </Paper>
  );
};
