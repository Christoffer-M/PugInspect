import {
  Group,
  Image,
  Paper,
  Skeleton,
  Text,
  Stack,
  Table,
  Title,
  AspectRatio,
  Anchor,
} from "@mantine/core";
import { MythicPlusRun } from "../graphql/graphql";
import { TWW_S3_DUNGEONS } from "../data/dungeons_tww_s3";
import { IconStarFilled } from "@tabler/icons-react";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  isFetching: boolean;
};

export const MythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns,
  isFetching = false,
}) => {
  // combine characterRuns with TWW_S3_DUNGEONS and sort by key level desc
  const combinedRuns = TWW_S3_DUNGEONS.map((dungeon) => {
    const run = characterRuns.find(
      (run) => run.challange_mode_id === dungeon.challenge_mode_id,
    );
    return {
      ...dungeon,
      key_level: run?.key_level ?? 0,
      completed_at: run?.completed_at ?? null,
      keystone_upgrades: run?.keystone_upgrades ?? 0,
      runUrl: run?.url ?? null,
    };
  });

  combinedRuns.sort((a, b) => b.key_level - a.key_level);

  const rows = combinedRuns.map((dungeon) => {
    const completedAt = dungeon.completed_at
      ? new Date(dungeon.completed_at).toLocaleDateString()
      : "-";
    return (
      <Table.Tr key={dungeon.id}>
        <Table.Td>
          <Group gap={"xs"}>
            <AspectRatio ratio={1} w={25}>
              <Image src={dungeon.icon_url} alt={dungeon.name} />
            </AspectRatio>
            {dungeon.runUrl ? (
              <Anchor
                size="sm"
                m={0}
                href={dungeon.runUrl ?? "#"}
                target="_blank"
                underline="never"
              >
                {dungeon.name}
              </Anchor>
            ) : (
              <Text size="sm" m={0}>
                {dungeon.name}
              </Text>
            )}
          </Group>
        </Table.Td>
        <Table.Td>
          <Skeleton
            visible={isFetching}
            style={{ display: "flex", alignItems: "center" }}
          >
            <Group gap={4}>
              <Text size="sm" m={0}>
                {dungeon.key_level ?? "-"}
              </Text>

              {Array.from({ length: dungeon?.keystone_upgrades ?? 0 }).map(
                (_, i) => (
                  <IconStarFilled key={i} size={10} color="gold" />
                ),
              )}
            </Group>
          </Skeleton>
        </Table.Td>
        <Table.Td>
          <Skeleton visible={isFetching}>
            <Text size="sm" m={0}>
              {completedAt}
            </Text>
          </Skeleton>
        </Table.Td>
      </Table.Tr>
    );
  });
  return (
    <Stack w={"100%"} gap={0}>
      <Title order={3}>Top Mythic+ Runs</Title>
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Dungeon Name</Table.Th>
              <Table.Th>Key Level</Table.Th>
              <Table.Th>Completed At</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
};
