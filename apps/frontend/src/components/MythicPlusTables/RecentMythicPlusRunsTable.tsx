import { Stack, Table, Title } from "@mantine/core";
import { MythicPlusRun } from "../../graphql/graphql";
import RunTableRow from "./components/RunTableRow";
import RunTableHeader from "./components/RunTableHeader";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  isFetching: boolean;
};

export const RecentMythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns: characterRuns,
  isFetching = false,
}) => {
  const rows = characterRuns.map((run) => {
    return (
      <RunTableRow
        key={run.challange_mode_id}
        mythicPlusRun={run}
        isFetching={isFetching}
        onClick={() => {
          console.log("clicked");
        }}
      />
    );
  });
  return (
    <Stack flex={1} gap={0}>
      <Title order={3}>Latest M+ Runs</Title>
      <Table.ScrollContainer minWidth={300} maxHeight={400}>
        <Table stickyHeader withTableBorder>
          <RunTableHeader />
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
};
