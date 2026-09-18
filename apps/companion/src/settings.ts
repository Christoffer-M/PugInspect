import { useState } from "react";

export type Settings = {
  launchAtLogin: boolean;
  startMinimized: boolean;
  alwaysOnTop: boolean;
  closeAction: "hide" | "quit";
  openInApp: boolean;
  /** Master switch; the titlebar bell and Settings both write it. */
  notifications: boolean;
  notifyApplicant: boolean;
  notifyListing: boolean;
  sound: boolean;
  analytics: boolean;
};

const KEY = "pi-settings";
const DEFAULTS: Settings = {
  launchAtLogin: false,
  startMinimized: false,
  alwaysOnTop: true,
  closeAction: "hide",
  openInApp: false,
  notifications: true,
  notifyApplicant: true,
  notifyListing: true,
  sound: false,
  analytics: true,
};

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setState] = useState(loadSettings);
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    setState(next);
  };
  return [settings, update] as const;
}
