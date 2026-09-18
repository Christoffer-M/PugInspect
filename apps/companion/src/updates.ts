import { useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { count } from "./analytics";

const CHECK_MS = 6 * 60 * 60 * 1000; // app runs for whole play sessions

export type UpdateState = {
  version: string;
  notes: string;
  installing: boolean;
  done: boolean;
  error: string | null;
  install: () => void;
};

type Phase = "idle" | "installing" | "done" | { error: string };
export type CheckResult = "latest" | "available" | "failed";

/** Polls the updater endpoint; returns install controls once an update exists (else null),
 *  plus a manual check for the settings screen. */
export function useUpdate(): [UpdateState | null, () => Promise<CheckResult>] {
  const [update, setUpdate] = useState<Update | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const poll = useRef<() => Promise<CheckResult>>(async () => "failed");

  useEffect(() => {
    if (phase === "installing" || phase === "done") {
      poll.current = async () => "available"; // don't swap the update mid-install
      return;
    }
    let stale = false;
    poll.current = async () => {
      try {
        const next = await check();
        if (!next) return "latest";
        if (stale || next.version === update?.version) {
          next.close(); // Rust-side resource — don't leak the rid
          return "available";
        }
        update?.close();
        setUpdate(next);
        setPhase("idle"); // a newer release supersedes a failed install of the old one
        return "available";
      } catch (e) {
        console.warn("update check failed:", e); // offline or no release yet — the next interval retries
        return "failed";
      }
    };
    poll.current();
    const id = window.setInterval(() => poll.current(), CHECK_MS);
    return () => {
      stale = true;
      window.clearInterval(id);
    };
  }, [update, phase]);

  const checkNow = () => poll.current();
  if (!update) return [null, checkNow];
  return [{
    version: update.version,
    notes: update.body?.trim() ?? "",
    installing: phase === "installing",
    done: phase === "done",
    error: typeof phase === "object" ? phase.error : null,
    install: () => {
      setPhase("installing");
      // On Windows the NSIS installer exits and relaunches the app itself, so
      // "done" is only reached where the promise resolves (dev mock, macOS).
      update.downloadAndInstall().then(
        () => setPhase("done"),
        (e) => {
          // A failed install is invisible otherwise, and it is what strands an
          // install on an old build; the beat carries the count out.
          count("updateFailures");
          setPhase({ error: String(e) });
        },
      );
    },
  }, checkNow];
}
