import { Paper, Stack, Table, Title } from "@mantine/core";
import { MythicPlusRun } from "../../graphql/graphql";
import RunTableRow from "./components/RunTableRow/RunTableRow";
import RunTableHeader from "./components/RunTableHeader";
import { CURRENT_DUNGEONS } from "../../generated/seasonConfig";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  characterClass?: string | null;
  isFetching: boolean;
};

export const BestMythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns,
  characterClass,
  isFetching = false,
}) => {
  // Every dungeon of the season gets a row, run or not.
  const rows = CURRENT_DUNGEONS.map((dungeon) => ({
    dungeon,
    run: characterRuns.find((run) => run.dungeonId === dungeon.challenge_mode_id),
  }))
    .sort((a, b) => (b.run?.keyLevel ?? 0) - (a.run?.keyLevel ?? 0))
    .map(({ dungeon, run }) => (
      <RunTableRow
        key={dungeon.challenge_mode_id}
        dungeonId={dungeon.challenge_mode_id}
        dungeonName={dungeon.name}
        mythicPlusRun={run}
        characterClass={characterClass}
        isFetching={isFetching}
      />
    ));

  return (
    <Stack flex={1} gap={0}>
      <Title order={3} m={0} mb={4}>Top M+ Runs</Title>
      <Paper withBorder>
        <Table.ScrollContainer minWidth={350}>
          <Table verticalSpacing="xs" horizontalSpacing="md">
            <RunTableHeader />
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
};
