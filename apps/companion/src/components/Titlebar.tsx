import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconBell, IconBellOff, IconMinus, IconSettings, IconSquare, IconX } from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import app from "../App.module.css";
import classes from "./Titlebar.module.css";

type Props = {
  tone: "accent" | "ok" | "lost";
  /** Settings screen: shows a back arrow instead of the brand dot. */
  onBack?: () => void;
  onSettings?: () => void;
  /** Main screen only: the notifications master switch, mirrored in Settings. */
  muted?: boolean;
  onToggleMute?: () => void;
};

export function Titlebar({ tone, onBack, onSettings, muted, onToggleMute }: Props) {
  const win = getCurrentWindow();
  const dot = tone === "ok" ? app.dotOk : tone === "lost" ? app.dotLost : app.dotAccent;
  return (
    <div className={classes.bar} data-tauri-drag-region>
      <Group gap={8} data-tauri-drag-region>
        {onBack ? (
          <ActionIcon variant="subtle" size="md" onClick={onBack} aria-label="Back">
            <IconArrowLeft size={16} />
          </ActionIcon>
        ) : (
          <span className={`${app.dot} ${dot}`} style={{ animation: "none" }} />
        )}
        <span className={classes.brand}>{onBack ? "Settings" : "PugInspect"}</span>
        {!onBack && <span className={classes.sub}>Companion</span>}
      </Group>
      <div className={classes.controls}>
        {onToggleMute && (
          <Tooltip label={muted ? "Unmute notifications" : "Mute notifications"} openDelay={400}>
            <ActionIcon variant="subtle" color="accent" size="md" onClick={onToggleMute} aria-label="Toggle notifications" aria-pressed={!muted}>
              {muted ? <IconBellOff size={17} color="var(--mantine-color-dark-3)" /> : <IconBell size={17} color="var(--mantine-color-accent-5)" />}
            </ActionIcon>
          </Tooltip>
        )}
        {onSettings && (
          <ActionIcon variant="subtle" color="gray" size="md" onClick={onSettings} aria-label="Settings">
            <IconSettings size={15} />
          </ActionIcon>
        )}
        <ActionIcon variant="subtle" color="gray" size="md" onClick={() => win.minimize()} aria-label="Minimize">
          <IconMinus size={15} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={() => win.toggleMaximize()} aria-label="Maximize">
          <IconSquare size={13} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={() => win.close()} aria-label="Close">
          <IconX size={15} />
        </ActionIcon>
      </div>
    </div>
  );
}
