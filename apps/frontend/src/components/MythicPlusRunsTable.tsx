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
} from "@mantine/core";
import { MythicPlusRun } from "../graphql/graphql";
import { TWW_S3_DUNGEONS } from "../data/dungeons_tww_s3";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  isFetching: boolean;
};

export const MythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns,
  isFetching = false,
}) => {
  console.log("characterRuns", characterRuns);

  const rows = TWW_S3_DUNGEONS.map((dungeon) => {
    const run = characterRuns.find(
      (run) => run.challange_mode_id === dungeon.challenge_mode_id,
    );

    const completedAt = run?.completed_at
      ? new Date(run.completed_at).toLocaleDateString()
      : "-";
    return (
      <Table.Tr key={dungeon.id}>
        <Table.Td>
          <Group gap={"xs"}>
            <AspectRatio ratio={1} w={25}>
              <Image src={dungeon.icon_url} alt={dungeon.name} />
            </AspectRatio>
            <Text>{dungeon.name}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Skeleton visible={isFetching}>
            <Text size="sm">{run?.key_level}</Text>
          </Skeleton>
        </Table.Td>
        <Table.Td>
          <Skeleton visible={isFetching}>
            <Text size="sm">{completedAt}</Text>
          </Skeleton>
        </Table.Td>
      </Table.Tr>
    );
  });

  // Sort rows by key level descending
  rows.sort((a, b) => {
    const aKeyLevel = parseInt(a.props.children[1].props.children);
    const bKeyLevel = parseInt(b.props.children[1].props.children);
    return (bKeyLevel || 0) - (aKeyLevel || 0);
  });

  return (
    <Stack w={"100%"} gap={0}>
      <Title order={3}>Top Mythic+ Runs (Season 3)</Title>
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
