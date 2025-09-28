import { Stack, Table, Title } from "@mantine/core";
import { MythicPlusRun } from "../../graphql/graphql";
import { TWW_S3_DUNGEONS } from "../../data/dungeons_tww_s3";
import RunTableRow from "./components/RunTableRow";
import RunTableHeader from "./components/RunTableHeader";

type MythicPlusRunsTableProps = {
  characterRuns: MythicPlusRun[];
  isFetching: boolean;
};

export const BestMythicPlusRunsTable: React.FC<MythicPlusRunsTableProps> = ({
  characterRuns: characterRuns,
  isFetching = false,
}) => {
  const combinedRuns: (MythicPlusRun | undefined)[] = TWW_S3_DUNGEONS.map(
    (dungeon) => {
      const run = characterRuns.find(
        (run) => run.challange_mode_id === dungeon.challenge_mode_id,
      );
      return {
        ...run,
        dungeon: dungeon.name,
        icon_url: dungeon.icon_url,
      } as MythicPlusRun | undefined;
    },
  );

  combinedRuns.sort((a, b) => (b?.key_level ?? 0) - (a?.key_level ?? 0));

  const rows = combinedRuns.map((dungeon) => {
    return (
      <RunTableRow
        key={dungeon?.challange_mode_id}
        mythicPlusRun={dungeon}
        isFetching={isFetching}
        onClick={() => {
          console.log("clicked");
        }}
      />
    );
  });
  return (
    <Stack flex={1} gap={0}>
      <Title order={3}>Top M+ Runs</Title>
      <Table withTableBorder>
        <RunTableHeader />
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Stack>
  );
};
