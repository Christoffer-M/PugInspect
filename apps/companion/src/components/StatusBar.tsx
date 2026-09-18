import type { ReactNode } from "react";
import { Group } from "@mantine/core";
import app from "../App.module.css";
import classes from "./StatusBar.module.css";

type Props = { tone: "idle" | "ok" | "lost"; label: string; detail?: string; right?: ReactNode; muted?: boolean };

export function StatusBar({ tone, label, detail, right, muted }: Props) {
  const dot = tone === "ok" ? app.dotOk : tone === "lost" ? app.dotLost : app.dotAccent;
  return (
    <div className={classes.bar}>
      <Group gap={7}>
        <span className={`${app.dot} ${dot}`} />
        <span className={classes[tone]}>{label}</span>
        {muted && <span className={classes.muted}>· notifications muted</span>}
        {detail && <span className={app.mono}>· {detail}</span>}
      </Group>
      {right}
    </div>
  );
}
