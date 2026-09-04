import type { ReactNode } from "react";
import { Group, SegmentedControl, Switch } from "@mantine/core";
import type { Settings as S } from "../settings";
import app from "../App.module.css";
import classes from "./Settings.module.css";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Group gap={9} mb={8}>
        <span className={app.accentBar} style={{ height: 13 }} />
        <span className={app.label}>{title}</span>
      </Group>
      <div className={classes.group}>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  indent,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  indent?: boolean;
}) {
  return (
    <label className={`${classes.rowItem} ${indent ? classes.indent : ""}`}>
      {label}
      <Switch size="xs" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    </label>
  );
}

export function Settings({ settings, update }: { settings: S; update: (p: Partial<S>) => void }) {
  return (
    <div className={classes.scroll}>
      <Section title="Startup">
        <Toggle label="Launch at login" checked={settings.launchAtLogin} onChange={(v) => update({ launchAtLogin: v })} />
        <Toggle label="Start minimized to tray" checked={settings.startMinimized} onChange={(v) => update({ startMinimized: v })} />
      </Section>
      <Section title="Window">
        <Toggle label="Always on top" checked={settings.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} />
        <div className={classes.rowItem}>
          Close button
          <SegmentedControl
            size="xs"
            value={settings.closeAction}
            onChange={(v) => update({ closeAction: v as S["closeAction"] })}
            data={[
              { label: "Hide to tray", value: "hide" },
              { label: "Quit", value: "quit" },
            ]}
          />
        </div>
      </Section>
      <Section title="Notifications">
        <Toggle label="Desktop notifications" checked={settings.notifyApplicant || settings.notifyListing} onChange={(v) => update({ notifyApplicant: v, notifyListing: v })} />
        <Toggle indent label="New applicant" checked={settings.notifyApplicant} onChange={(v) => update({ notifyApplicant: v })} />
        <Toggle indent label="New listing detected" checked={settings.notifyListing} onChange={(v) => update({ notifyListing: v })} />
        <Toggle indent label="Play a sound" checked={settings.sound} onChange={(v) => update({ sound: v })} />
      </Section>
      <Section title="Privacy">
        <Toggle
          label="Send anonymous usage statistics"
          checked={settings.analytics}
          onChange={(v) => update({ analytics: v })}
        />
      </Section>
    </div>
  );
}
