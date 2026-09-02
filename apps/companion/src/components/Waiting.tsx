import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import app from "../App.module.css";
import classes from "./Waiting.module.css";
import type { Link } from "../state";

const ADDON_URL = "https://www.curseforge.com/wow/addons/puginspect";

export function Waiting({ link }: { link: Link }) {
  const noGame = link === "no_window";
  const mismatch = link === "incompatible";
  return (
    <div className={classes.center}>
      <div className={classes.beacon}>
        <div className={classes.ring} />
        <div className={`${classes.ring} ${classes.ring2}`} />
        <div className={classes.core}>
          <div className={classes.coreDot} />
        </div>
      </div>
      <div className={classes.title}>
        {noGame ? "Waiting for World of Warcraft" : mismatch ? "Addon and app versions differ" : "Listening for the addon"}
      </div>
      <div className={classes.hint}>
        {noGame
          ? "Start the game in Windowed or Windowed (Fullscreen) mode. The companion reads the top edge of the game window - nothing is stored or uploaded."
          : mismatch
            ? "The strip is being read but its format is not what this app expects. Update the PugInspect addon and this app to matching versions, then /reload."
            : "Type /pi hud in-game once to enable the addon's strip, then list a group - applicants start appearing here."}
      </div>
      <Paper withBorder p="12px 14px" className={classes.card}>
        <Stack gap={8}>
          <span className={app.label}>Addon</span>
          <Group justify="space-between" gap={10}>
            <Text ff="var(--mono)" size="11px" c="dark.0">
              PugInspect addon
            </Text>
            <Button size="compact-xs" variant="light" onClick={() => openUrl(ADDON_URL)}>
              Install ↗
            </Button>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}
