import { useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

const CHECK_MS = 6 * 60 * 60 * 1000; // app runs for whole play sessions

export type UpdateState = {
  version: string;
  installing: boolean;
  error: string | null;
  install: () => void;
};

/** Polls the updater endpoint; returns install controls once an update exists, else null. */
export function useUpdate(): UpdateState | null {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef(update);
  updateRef.current = update;

  useEffect(() => {
    const poll = async () => {
      try {
        if (!updateRef.current) setUpdate(await check());
      } catch {
        // offline or no release yet — the next interval retries
      }
    };
    poll();
    const id = window.setInterval(poll, CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!update) return null;
  return {
    version: update.version,
    installing,
    error,
    install: () => {
      setInstalling(true);
      setError(null);
      // ponytail: no progress UI — NSIS installs finish in seconds, and on
      // Windows the installer exits and relaunches the app itself.
      update.downloadAndInstall().catch((e) => {
        setInstalling(false);
        setError(String(e));
      });
    },
  };
}
