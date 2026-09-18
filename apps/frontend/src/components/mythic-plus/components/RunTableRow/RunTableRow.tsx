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
import { IconStarFilled } from "@tabler/icons-react";
import { MythicPlusRun } from "../../../../graphql/graphql";
import classes from "./RunTableRow.module.css";
import { DungeonNameMaxWidth } from "../RunTableHeader";
import { getClassIconSrc } from "../../../../assets/classIcons";
import { CURRENT_DUNGEONS } from "../../../../generated/seasonConfig";

const DUNGEON_ICONS = new Map(CURRENT_DUNGEONS.map((d) => [d.challenge_mode_id, d.icon_url]));

type DungeonRowProps = {
  dungeonId?: number;
  dungeonName?: string;
  mythicPlusRun?: MythicPlusRun;
  /** The character's class — the run only carries the spec. */
  characterClass?: string | null;
  isFetching: boolean;
};

const RunTableRow: React.FC<DungeonRowProps> = ({
  dungeonId,
  dungeonName,
  mythicPlusRun,
  characterClass,
  isFetching,
}) => {
  const specName = mythicPlusRun?.spec ?? "Unknown Spec";
  const classImageSrc =
    characterClass && mythicPlusRun?.spec ? getClassIconSrc(characterClass, mythicPlusRun.spec) : undefined;
  const iconUrl = dungeonId != null ? DUNGEON_ICONS.get(dungeonId) : undefined;
  const url = mythicPlusRun?.url;

  const completedAt = mythicPlusRun?.completedAt
    ? new Date(mythicPlusRun.completedAt).toLocaleDateString()
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
              src={iconUrl}
              alt={dungeonName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>
          <Tooltip label={dungeonName ?? "Unknown Dungeon"} withArrow openDelay={50} style={{ minWidth: 0, flex: 1 }} >
            {url ? <Anchor size="sm" m={0} href={url} target="_blank" truncate='end' style={{ display: 'block' }} >
              {dungeonName}
            </Anchor> : <Text size="sm" m={0} style={{ display: 'block' }} truncate='end'  >
              {dungeonName}
            </Text>}
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Skeleton visible={isFetching} className={classes.skeleton}>
          <Group gap={4}>
            <Text size="sm" m={0}>
              {mythicPlusRun?.keyLevel ?? "-"}
            </Text>
            {Array.from({ length: mythicPlusRun?.upgrades ?? 0 }).map(
              (_, i) => (
                <IconStarFilled key={i} size={10} color="gold" />
              ),
            )}
          </Group>
        </Skeleton>
      </Table.Td>
      <Table.Td>
        <Skeleton visible={isFetching} className={classes.skeleton}>
          {classImageSrc && (
            <Tooltip label={specName} withArrow openDelay={50}>
              <Box style={{
                width: 22, height: 22, flexShrink: 0,
                borderRadius: "var(--mantine-radius-xs)",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}>
                <img
                  src={classImageSrc}
                  alt={specName}
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
