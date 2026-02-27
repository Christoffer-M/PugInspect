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
import { HistoryEntry, useSearchHistory } from "../../hooks/useSearchHistory";
import { RoleType } from "../../graphql/graphql";
import classes from "./SearchHistoryDrawer.module.css";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

function getClassColor(className?: string): string {
  if (!className) return "#8a96aa";
  return CLASS_COLORS[className.toLowerCase()] ?? "#8a96aa";
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

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

              <Text size="sm" fw={600} truncate>
                {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
              </Text>
              <Badge size="xs" variant="outline" color="accent" className={classes.itemBadge}>
                {entry.region.toUpperCase()}
              </Badge>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed" truncate>
                {entry.realm.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Text>
              <Text size="xs" c="dimmed" className={classes.itemTime}>
                · {formatRelativeTime(entry.timestamp)}
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
        realm: entry.realm.toLowerCase(),
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
            variant="subtle"
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
