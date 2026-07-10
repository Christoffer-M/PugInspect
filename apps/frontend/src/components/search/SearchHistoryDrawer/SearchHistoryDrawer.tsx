import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { getClassColor, normalizeRealm, timeAgo } from "../../../util/util";
import { HistoryEntry, useSearchHistory } from "../../../hooks/useSearchHistory";
import { RoleType } from "../../../graphql/graphql";
import classes from "./SearchHistoryDrawer.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
};

function HistoryItem({
  entry,
  onNavigate,
}: {
  entry: HistoryEntry;
  onNavigate: () => void;
}) {
  const { remove } = useSearchHistory();

  return (
    <Group gap="xs" wrap="nowrap" className={classes.item}>
      <UnstyledButton onClick={onNavigate} className={classes.itemButton}>
        <Group gap="xs" wrap="nowrap" >
          <Box
            w={10}
            h={10}
            bdrs={"50%"}
            bg={getClassColor(entry.class)}
            style={{ flexShrink: 0 }}
          />
          <Stack gap={0} className={classes.itemStack}>
            <Group gap="xs" wrap="nowrap">

              <Text size="sm" fw={600} truncate tt="capitalize">
                {entry.name}
              </Text>
              <Badge size="xs" variant="outline" color="accent" className={classes.itemBadge}>
                {entry.region.toUpperCase()}
              </Badge>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed" truncate tt="capitalize">
                {entry.realm}
              </Text>
              <Text size="xs" c="dimmed" className={classes.itemTime}>
                · {timeAgo(entry.timestamp)}
              </Text>
            </Group>
          </Stack>
        </Group>
      </UnstyledButton>

      <ActionIcon
        size="sm"
        variant="subtle"
        color="red"
        aria-label={`Remove ${entry.name} from history`}
        onClick={() => remove(entry)}
        className={classes.trash}
      >
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}

export function SearchHistoryDrawer({ opened, onClose }: Props) {
  const { history, clear } = useSearchHistory();
  const navigate = useNavigate();

  const handleNavigate = (entry: HistoryEntry) => {
    navigate({
      to: "/$region/$realm/$name",
      params: {
        region: entry.region.toLowerCase(),
        realm: normalizeRealm(entry.realm),
        name: entry.name.toLowerCase(),
      },
      search: {
        roleType: RoleType.Any,
      },
    });
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={700}>
          Search History
        </Text>
      }
      position="right"
      size="sm"
      classNames={{
        header: classes.drawerHeader,
        body: classes.drawerBody,
        overlay: classes.drawerOverlay,
      }}
    >
      {history.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" mt="xl">
          No recent characters
        </Text>
      ) : (
        <Stack gap={2}>
          {history.map((entry) => (
            <HistoryItem
              key={`${entry.region}-${entry.realm}-${entry.name}`}
              entry={entry}
              onNavigate={() => handleNavigate(entry)}
            />
          ))}

          <Button
            variant="light"
            color="red"
            size="xs"
            mt="md"
            onClick={clear}
            leftSection={<IconTrash size={12} />}
          >
            Clear all
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
