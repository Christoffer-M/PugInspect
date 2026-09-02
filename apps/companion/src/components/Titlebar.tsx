import { ActionIcon, Group, Text } from "@mantine/core";
import { IconArrowLeft, IconMinus, IconSettings, IconSquare, IconX } from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import app from "../App.module.css";
import classes from "./Titlebar.module.css";

type Props = {
  tone: "accent" | "ok" | "lost";
  /** Settings screen: shows a back arrow instead of the brand dot. */
  onBack?: () => void;
  onSettings?: () => void;
};

export function Titlebar({ tone, onBack, onSettings }: Props) {
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
        {!onBack && (
          <Text size="10.5px" c="dark.3">
            Companion
          </Text>
        )}
      </Group>
      <div className={classes.controls}>
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
