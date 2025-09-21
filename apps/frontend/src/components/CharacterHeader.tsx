import {
  useMantineTheme,
  Paper,
  Group,
  Skeleton,
  Stack,
  Title,
  Image,
} from "@mantine/core";
import { GetWarcraftLogRankingColors } from "../util/util";
import { RankingGroup } from "./RankingGroup";
import RaiderIoIocn from "../../icons/raiderio-icon.svg";
import WarcraftLogsIcon from "../../icons/warcraftlogs-icon.svg";
import { ExternalLinkIcon } from "./ExternalLinkIcon";

const upperCaseString = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const CharacterHeader: React.FC<{
  name: string;
  region: string;
  server: string;
  data: any;
  loading: boolean;
  isError: boolean;
}> = ({ name, region, server, data, loading, isError }) => {
  const theme = useMantineTheme();
  const medianPerformance = data?.logs?.medianPerformanceAverage;
  const bestPerformance = data?.logs?.bestPerformanceAverage;

  return (
    <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
      <Group justify="space-between">
        <Group h="100%">
          <div>
            {loading || isError ? (
              <Skeleton h={85} w={85} radius={100} m={0} animate={!isError} />
            ) : (
              <Image
                src={data?.thumbnailUrl}
                alt={`${data?.name}`}
                h={85}
                w={85}
                fit="contain"
                radius={100}
                m={0}
              />
            )}
          </div>

          <Stack
            gap={0}
            justify="flex-start"
            h="100%"
            flex={1}
            align="flex-start"
          >
            <Group gap="xs" justify="flex-start" align="center">
              <Title order={3} m={0}>
                {upperCaseString(name)}
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

            <Title order={5} m={0}>
              ({region}) {upperCaseString(server)}
            </Title>
          </Stack>
        </Group>

        <Stack align="flex-end" gap={0}>
          <RankingGroup
            label="RIO score:"
            value={data?.raiderIoScore?.all?.score}
            color={data?.raiderIoScore?.all?.color}
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
