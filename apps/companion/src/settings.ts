import { useState } from "react";

export type Settings = {
  launchAtLogin: boolean;
  startMinimized: boolean;
  alwaysOnTop: boolean;
  closeAction: "hide" | "quit";
  notifyApplicant: boolean;
  notifyListing: boolean;
  sound: boolean;
};

const KEY = "pi-settings";
const DEFAULTS: Settings = {
  launchAtLogin: false,
  startMinimized: false,
  alwaysOnTop: true,
  closeAction: "hide",
  notifyApplicant: true,
  notifyListing: true,
  sound: false,
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
