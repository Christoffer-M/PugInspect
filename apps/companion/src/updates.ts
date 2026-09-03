import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

const CHECK_MS = 6 * 60 * 60 * 1000; // app runs for whole play sessions

export type UpdateState = {
  version: string;
  installing: boolean;
  done: boolean;
  error: string | null;
  install: () => void;
};

type Phase = "idle" | "installing" | "done" | { error: string };

/** Polls the updater endpoint; returns install controls once an update exists, else null. */
export function useUpdate(): UpdateState | null {
  const [update, setUpdate] = useState<Update | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase === "installing" || phase === "done") return; // don't swap the update mid-install
    let stale = false;
    const poll = async () => {
      try {
        const next = await check();
        if (!next) return;
        if (stale || next.version === update?.version) {
          next.close(); // Rust-side resource — don't leak the rid
          return;
        }
        update?.close();
        setUpdate(next);
        setPhase("idle"); // a newer release supersedes a failed install of the old one
      } catch (e) {
        console.warn("update check failed:", e); // offline or no release yet — the next interval retries
      }
    };
    poll();
    const id = window.setInterval(poll, CHECK_MS);
    return () => {
      stale = true;
      window.clearInterval(id);
    };
  }, [update, phase]);

  if (!update) return null;
  return {
    version: update.version,
    installing: phase === "installing",
    done: phase === "done",
    error: typeof phase === "object" ? phase.error : null,
    install: () => {
      setPhase("installing");
      // On Windows the NSIS installer exits and relaunches the app itself, so
      // "done" is only reached where the promise resolves (dev mock, macOS).
      update.downloadAndInstall().then(
        () => setPhase("done"),
        (e) => setPhase({ error: String(e) }),
      );
    },
  };
}
