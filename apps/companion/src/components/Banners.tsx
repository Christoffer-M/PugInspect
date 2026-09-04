import { ActionIcon, Button, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { UpdateState } from "../updates";
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
export function VersionMismatch({ link, hasUpdate }: { link: "incompatible" | "addon_outdated" | "app_outdated" | string; hasUpdate?: boolean }) {
  const hint =
    link === "addon_outdated"
      ? "Update the PugInspect addon, then /reload."
      : link === "app_outdated"
        ? hasUpdate
          ? "Install the app update above."
          : "An app update will be offered above when available."
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

export function UpdateBanner({ update, onClose }: { update: UpdateState; onClose: () => void }) {
  return (
    <div className={classes.toast}>
      <span className={app.accentBar} />
      <Stack gap={5} style={{ flex: 1 }}>
        <span className={app.label} style={{ color: "var(--mantine-color-accent-2)" }}>
          Update available
        </span>
        <span className={classes.toastSub}>
          {update.done ? "Update installed. Restart the app to finish." : update.error ? `Update failed: ${update.error}` : `Companion ${update.version} is out. Installing restarts the app.`}
        </span>
        {!update.done && !update.error && update.notes && (
          <details className={classes.notes}>
            <summary>What's new</summary>
            {/* ponytail: the notes are plain markdown bullets, rendered as text — add a parser only if they grow past that */}
            <div className={classes.notesBody}>{update.notes}</div>
          </details>
        )}
        {!update.done && (
          <div>
            <Button size="compact-xs" variant="light" loading={update.installing} onClick={update.install}>
              {update.error ? "Retry" : "Install & restart"}
            </Button>
          </div>
        )}
      </Stack>
      {!update.installing && (
        <ActionIcon variant="subtle" color="gray" size="xs" onClick={onClose} aria-label="Dismiss">
          <IconX size={12} />
        </ActionIcon>
      )}
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
