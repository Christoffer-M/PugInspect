import {
  Container,
  Paper,
  Stack,
  Image,
  Group,
  Title,
  useMantineTheme,
  Skeleton,
  Text,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { regions } from "../components/CharacterSearchInput";
import { useSearch } from "@tanstack/react-router";
import { useCharacterQuery } from "../queries/character-queries";
import { Page } from "../components/Page";
import { GetWarcraftLogRankingColors } from "../util/util";
import { RankingGroup } from "../components/RankingGroup";

type CharacterRouteSearch = {
  region: string;
  name: string;
  server: string;
};

const upperCaseString = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const Character: React.FC = () => {
  const theme = useMantineTheme();
  const { region, name, server } = useSearch({
    from: Route.fullPath,
  });

  const { data, isFetching, isError } = useCharacterQuery({
    name: name,
    realm: server,
    region: region,
  });

  const medianPerformance = data?.logs?.medianPerformanceAverage;
  const bestPerformance = data?.logs?.bestPerformanceAverage;

  return (
    <Page>
      <Container>
        <Stack mt="md" align="center" justify="center">
          <Paper shadow="xs" radius="xs" p="md" withBorder w="100%">
            <Group justify="space-between">
              <Group h="100%">
                <div>
                  {isFetching || isError ? (
                    <Skeleton
                      h={85}
                      w={85}
                      radius={100}
                      m={0}
                      animate={!isError}
                    />
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
                  <Title order={3} m={0}>
                    {upperCaseString(name)}
                  </Title>
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
                  isLoading={isFetching}
                />
                <RankingGroup
                  label="Best avg. log:"
                  value={bestPerformance}
                  color={
                    bestPerformance
                      ? GetWarcraftLogRankingColors(bestPerformance, theme)
                      : undefined
                  }
                  isLoading={isFetching}
                />
                <RankingGroup
                  label="Med. avg. log:"
                  value={medianPerformance}
                  color={
                    medianPerformance
                      ? GetWarcraftLogRankingColors(medianPerformance, theme)
                      : undefined
                  }
                  isLoading={isFetching}
                />
              </Stack>
            </Group>
          </Paper>
        </Stack>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/character")({
  component: Character,
  validateSearch: (search): CharacterRouteSearch => {
    const { region, name, server } = search;
    if (
      !regions.includes(region as string) ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof server !== "string" ||
      !server.trim()
    ) {
      throw new Error("Invalid region, name, or server");
    }
    return {
      region: region as string,
      name: name as string,
      server: server as string,
    };
  },
});
