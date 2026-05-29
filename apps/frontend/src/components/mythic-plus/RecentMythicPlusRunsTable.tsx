import { Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
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
      <Group gap={4} align="center" mb={4}>
        <Title order={3} m={0}>Latest M+ Runs</Title>
        {characterRuns.length > 0 && (
          <Text c="dimmed" size="sm">({characterRuns.length})</Text>
        )}
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={300}>
          <Table verticalSpacing="xs" horizontalSpacing="md">
            <RunTableHeader />
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                    No recent runs found
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
};
