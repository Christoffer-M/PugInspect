import { ActionIcon, Button, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
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

/** Shown in place of the sync-lost banner: /reload cannot fix a protocol mismatch. */
export function VersionMismatch({ link }: { link: "incompatible" | "addon_outdated" | "app_outdated" | string }) {
  const hint =
    link === "addon_outdated"
      ? "Update the PugInspect addon, then /reload."
      : link === "app_outdated"
        ? "Install the latest companion from the download page."
        : "Update the addon and the app to matching versions, then /reload.";
  return (
    <div className={classes.lost}>
      <div className={classes.lostBar} />
      <Stack gap={5}>
        <Text size="12px" c="var(--pi-text-bright)">
          Addon and app versions differ.
        </Text>
        <span className={classes.lostText}>{hint}</span>
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
        <span className={classes.toastSub}>Applicants from the old listing were cleared.</span>
      </Stack>
      <ActionIcon variant="subtle" color="gray" size="xs" onClick={onClose} aria-label="Dismiss">
        <IconX size={12} />
      </ActionIcon>
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="compact-xs" variant="default" onClick={onClick}>
      Retry now
    </Button>
  );
}
