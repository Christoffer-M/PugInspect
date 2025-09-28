import React from "react";
import {
  Group,
  Image,
  Skeleton,
  Text,
  AspectRatio,
  Table,
} from "@mantine/core";
import { IconStarFilled } from "@tabler/icons-react";
import { MythicPlusRun } from "../../../graphql/graphql";

type DungeonRowProps = {
  mythicPlusRun?: MythicPlusRun;
  isFetching: boolean;
  onClick?: () => void;
};

const RunTableRow: React.FC<DungeonRowProps> = ({
  mythicPlusRun,
  isFetching,
  onClick,
}) => {
  const completedAt = mythicPlusRun?.completed_at
    ? new Date(mythicPlusRun.completed_at).toLocaleDateString()
    : "-";
  return (
    <Table.Tr key={mythicPlusRun?.challange_mode_id} onClick={onClick}>
      <Table.Td>
        <Group gap={"xs"}>
          <AspectRatio ratio={1} w={25}>
            <Image src={mythicPlusRun?.icon_url} alt={mythicPlusRun?.dungeon} />
          </AspectRatio>
          <Text size="sm" m={0}>
            {mythicPlusRun?.dungeon}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Skeleton
          visible={isFetching}
          style={{ display: "flex", alignItems: "center" }}
        >
          <Group gap={4}>
            <Text size="sm" m={0}>
              {mythicPlusRun?.key_level ?? "-"}
            </Text>
            {Array.from({ length: mythicPlusRun?.keystone_upgrades ?? 0 }).map(
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
};

export default RunTableRow;
