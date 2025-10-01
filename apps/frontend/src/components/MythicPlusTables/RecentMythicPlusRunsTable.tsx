import { Group, Stack, Table, Title, Text } from "@mantine/core";
import { MythicPlusRun } from "../../graphql/graphql";
import RunTableRow from "./components/RunTableRow/RunTableRow";
import RunTableHeader from "./components/RunTableHeader";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  isFetching: boolean;
};

export const RecentMythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns: characterRuns,
  isFetching = false,
}) => {
  const rows = characterRuns.map((run, idx) => {
    return (
      <RunTableRow
        key={`best-mythic-plus-run-${run.dungeon}-${idx}`}
        mythicPlusRun={run}
        isFetching={isFetching}
        url={run?.url}
      />
    );
  });
  return (
    <Stack flex={1} gap={0}>
      <Group gap={4} align="flex-start">
        <Title order={3}>Latest M+ Runs </Title>
        <Text c="dimmed" ta={"start"}>
          ({characterRuns.length})
        </Text>
      </Group>

      <Table.ScrollContainer minWidth={300} maxHeight={400}>
        <Table stickyHeader withTableBorder highlightOnHover>
          <RunTableHeader />
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={3} style={{ textAlign: "center" }}>
                  No recent runs found
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
};
