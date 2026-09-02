import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { Session } from "../state";
import app from "../App.module.css";
import classes from "./Banners.module.css";

export function SyncLost() {
  return (
    <div className={classes.lost}>
      <div className={classes.lostBar} />
      <Stack gap={5}>
        <Text size="12px" c="var(--pi-text-bright)">
          The addon stopped reporting.
        </Text>
        <span className={classes.lostText}>
          Type <span className={classes.code}>/reload</span> in-game to reconnect.
        </span>
      </Stack>
    </div>
  );
}

export function NewListingToast({ onClose }: { onClose: () => void }) {
  return (
    <div className={classes.toast}>
      <span className={app.accentBar} />
      <Stack gap={5} style={{ flex: 1 }}>
        <span className={app.label} style={{ color: "var(--mantine-color-accent-2)" }}>
          New group finder listing
        </span>
        <span className={classes.toastTitle}>Started a new session</span>
        <span className={classes.toastSub}>Previous applicants moved to history.</span>
      </Stack>
      <ActionIcon variant="subtle" color="gray" size="xs" onClick={onClose} aria-label="Dismiss">
        <IconX size={12} />
      </ActionIcon>
    </div>
  );
}

export function History({ sessions, onOpen }: { sessions: Session[]; onOpen: (s: Session) => void }) {
  const last = sessions[0];
  if (!last) return null;
  return (
    <Stack gap={7} className={classes.history}>
      <span className={app.label} style={{ color: "var(--mantine-color-dark-3)" }}>
        Previous session
      </span>
      <div className={classes.chip} onClick={() => onOpen(last)}>
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="11.5px" truncate>
            {last.title || "Group finder listing"}
          </Text>
          <span className={classes.pill}>
            {last.applicants.length} {last.applicants.length === 1 ? "applicant" : "applicants"}
          </span>
        </Group>
        <Text size="11px" c="dark.2">
          ›
        </Text>
      </div>
    </Stack>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="compact-xs" variant="default" onClick={onClick}>
      Retry now
    </Button>
  );
}
