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
          <ActionIcon variant="subtle" size="sm" onClick={onBack} aria-label="Back">
            <IconArrowLeft size={14} />
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
            <ActionIcon variant="subtle" color="accent" size="sm" onClick={onToggleMute} aria-label="Toggle notifications" aria-pressed={!muted}>
              {muted ? <IconBellOff size={15} color="var(--mantine-color-dark-3)" /> : <IconBell size={15} color="var(--mantine-color-accent-5)" />}
            </ActionIcon>
          </Tooltip>
        )}
        {onSettings && (
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={onSettings} aria-label="Settings">
            <IconSettings size={13} />
          </ActionIcon>
        )}
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => win.minimize()} aria-label="Minimize">
          <IconMinus size={13} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => win.toggleMaximize()} aria-label="Maximize">
          <IconSquare size={11} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => win.close()} aria-label="Close">
          <IconX size={13} />
        </ActionIcon>
      </div>
    </div>
  );
}
