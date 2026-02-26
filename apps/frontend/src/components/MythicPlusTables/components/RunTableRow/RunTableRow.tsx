import React from "react";
import {
  Group,
  Image,
  Skeleton,
  Text,
  AspectRatio,
  Table,
  Anchor,
  Tooltip,
} from "@mantine/core";
import { IconCirclePlus, IconQuestionMark, IconShield, IconStarFilled, IconSword } from "@tabler/icons-react";
import { MythicPlusRun } from "../../../../graphql/graphql";
import classes from "./RunTableRow.module.css";
import { DungeonNameMaxWidth } from "../RunTableHeader";
import { getClassIconSrc } from "../../../../assets/classIcons";

export function mapRoleToIcon(role?: string) {
  if (!role) return <IconQuestionMark />;
  switch (role.toLowerCase()) {
    case "tank":
      return <IconShield />;
    case "healer":
      return <IconCirclePlus />;
    case "dps":
      return <IconSword />;
    default:
      return <IconQuestionMark />;
  }
}


type DungeonRowProps = {
  mythicPlusRun?: MythicPlusRun;
  isFetching: boolean;
  url?: string;
};

const RunTableRow: React.FC<DungeonRowProps> = ({
  mythicPlusRun,
  isFetching,
  url,
}) => {

  const classNameSlug = mythicPlusRun?.class?.slug || "unknown";
  const specName = mythicPlusRun?.spec?.name || "Unknown Spec";
  const specSlug = mythicPlusRun?.spec?.slug?.replace(/-/g, "") || "unknown";

  const getClassImageSrc = () => {
    if (!mythicPlusRun?.class?.slug || !mythicPlusRun?.spec?.slug) return null;

    return getClassIconSrc(classNameSlug, specSlug);
  };

  const completedAt = mythicPlusRun?.completed_at
    ? new Date(mythicPlusRun.completed_at).toLocaleDateString()
    : "-";

  return (
    <Table.Tr>
      <Table.Td w={DungeonNameMaxWidth} style={{ maxWidth: 150, overflow: 'hidden' }}>
        <Group gap={"xs"} wrap="nowrap">
          <AspectRatio ratio={1} w={25} style={{ flexShrink: 0 }}>
            <Image src={mythicPlusRun?.icon_url} alt={mythicPlusRun?.dungeon} />
          </AspectRatio>
          <Tooltip label={mythicPlusRun?.dungeon ?? "Unknown Dungeon"} withArrow openDelay={50} style={{ minWidth: 0, flex: 1 }} >
            <Anchor size="sm" m={0} href={url} target="_blank" truncate='end' style={{ display: 'block' }}>
              {mythicPlusRun?.dungeon}
            </Anchor>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Skeleton visible={isFetching} className={classes.skeleton}>
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
        <Skeleton visible={isFetching} className={classes.skeleton}>
          {getClassImageSrc() && (
            <Tooltip label={specName} withArrow openDelay={50}>
              <Image
                h={22}
                w={22}
                fit="contain"
                radius={"xs"}
                alt={`${classNameSlug}-${specSlug}`}
                src={getClassImageSrc()}
              />
            </Tooltip>
          )}
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
