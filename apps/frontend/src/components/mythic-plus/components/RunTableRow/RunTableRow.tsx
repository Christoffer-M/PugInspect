import React from "react";
import {
  Group,
  Box,
  Skeleton,
  Text,
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
          <Box style={{
            width: 26, height: 26, flexShrink: 0,
            borderRadius: "var(--mantine-radius-md)",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}>
            <img
              src={mythicPlusRun?.icon_url}
              alt={mythicPlusRun?.dungeon}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>
          <Tooltip label={mythicPlusRun?.dungeon ?? "Unknown Dungeon"} withArrow openDelay={50} style={{ minWidth: 0, flex: 1 }} >
            {url ? <Anchor size="sm" m={0} href={url} target="_blank" truncate='end' style={{ display: 'block' }} >
              {mythicPlusRun?.dungeon}
            </Anchor> : <Text size="sm" m={0} style={{ display: 'block' }} truncate='end'  >
              {mythicPlusRun?.dungeon}
            </Text>}
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
              <Box style={{
                width: 22, height: 22, flexShrink: 0,
                borderRadius: "var(--mantine-radius-xs)",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}>
                <img
                  src={getClassImageSrc()!}
                  alt={`${classNameSlug}-${specSlug}`}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </Box>
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
