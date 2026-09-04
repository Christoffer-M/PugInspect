import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { pageClasses } from "@repo/ui";
import { keyOf, useCompanion } from "./state";
import { useSettings } from "./settings";
import { ding, notify } from "./notify";
import { Titlebar } from "./components/Titlebar";
import { StatusBar } from "./components/StatusBar";
import { Waiting } from "./components/Waiting";
import { Applicants } from "./components/Applicants";
import { NewListingToast, RetryButton, SyncLost, UpdateBanner, VersionMismatch } from "./components/Banners";
import { useUpdate } from "./updates";
import { Settings } from "./components/Settings";
import classes from "./App.module.css";

const TOAST_MS = 6000;

const ago = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
const pad = (n: number) => String(n).padStart(2, "0");

export default function App() {
  const [settings, update] = useSettings();
  const [screen, setScreen] = useState<"main" | "settings">("main");
  const [toastAt, setToastAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [version, setVersion] = useState("");
  const [startedAt] = useState(Date.now);
  const newRelease = useUpdate();
  const [dismissedUpdate, setDismissedUpdate] = useState("");
  const [notifiedUpdate, setNotifiedUpdate] = useState("");

  const { link, session, lookups, seenAt, lastFrameAt } = useCompanion({
    onNewListing: (s) => {
      setToastAt(Date.now());
      if (settings.notifyListing) notify("New group finder listing", s.title || "Started a new session");
      if (settings.sound) ding();
    },
    onNewApplicants: (fresh, s) => {
      if (settings.notifyApplicant)
        notify(fresh.length === 1 ? `${fresh[0]!.name} applied` : `${fresh.length} new applicants`, s.title);
      if (settings.sound) ding();
    },
  });

  // Update side effects: a system notification once per version (the window often
  // lives hidden in the tray), and an unprompted install when the addon protocol
  // already broke — the app can't function on the old version anyway. Guarded by
  // state rather than deps: newRelease is a fresh object each render.
  useEffect(() => {
    if (!newRelease) return;
    if (newRelease.version !== notifiedUpdate) {
      setNotifiedUpdate(newRelease.version);
      notify("Update available", `Companion ${newRelease.version} is ready to install.`);
    }
    if (link === "app_outdated" && !newRelease.installing && !newRelease.done && !newRelease.error) newRelease.install();
  });

  // 1 s tick for the relative timers and the "new" badge expiry.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    getVersion().then(setVersion);
    const win = getCurrentWindow();
    if (!settings.startMinimized) win.show();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  useEffect(() => {
    (settings.launchAtLogin ? enable() : disable()).catch(() => {});
  }, [settings.launchAtLogin]);

  useEffect(() => {
    const win = getCurrentWindow();
    // Always preventDefault: with a JS handler registered, Tauri expects JS to
    // finish the close itself (via destroy(), which needs a permission we don't
    // grant). Hide or exit explicitly instead.
    const unlisten = win.onCloseRequested((e) => {
      e.preventDefault();
      if (settings.closeAction === "hide") win.hide();
      else invoke("quit");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.closeAction]);

  const mismatch = link === "incompatible" || link === "addon_outdated" || link === "app_outdated";
  // The addon only paints while a listing is up, so "no frames" is only a problem
  // while we believe a listing is active — and a version mismatch is never "lost":
  // its remedy is updating a component, not the /reload the lost banner suggests.
  const lost = session !== null && link !== "ok" && !mismatch;
  const tone = lost || mismatch ? "lost" : session ? "ok" : "accent";

  if (screen === "settings") {
    return (
      <>
        <div className={pageClasses.appBg} />
        <div className={classes.app}>
          <Titlebar tone={tone} onBack={() => setScreen("main")} />
          <Settings settings={settings} update={update} />
          <StatusBar
            tone={lost || mismatch ? "lost" : session ? "ok" : "idle"}
            label={mismatch ? "Version mismatch" : lost ? "Sync lost" : session ? "Synced" : "Waiting to sync"}
            right={<span className={classes.mono}>app {version}</span>}
          />
        </div>
      </>
    );
  }

  const shown = session;
  const pendingLookups = shown ? shown.applicants.filter((a) => lookups[keyOf(a)]?.state === "loading").length : 0;
  const failed = shown ? shown.applicants.map((a) => lookups[keyOf(a)]).filter((l) => l?.state === "error") : [];
  const failedDetail = failed.length ? `${failed.length} lookup${failed.length === 1 ? "" : "s"} failed: ${failed[0]!.error ?? "unknown error"}` : undefined;
  // Item level only exists once the lookup lands, so average over the applicants that have one.
  const ilvls = (shown?.applicants ?? []).map((a) => lookups[keyOf(a)]?.entry?.character?.equippedItemLevel ?? 0).filter(Boolean);
  const avgIlvl = ilvls.length ? Math.round(ilvls.reduce((s, n) => s + n, 0) / ilvls.length) : 0;

  return (
    <>
      <div className={pageClasses.appBg} />
      <div className={classes.app}>
        <Titlebar tone={tone} onSettings={() => setScreen("settings")} />
        {newRelease && (newRelease.version !== dismissedUpdate || link === "app_outdated") && <UpdateBanner update={newRelease} onClose={() => setDismissedUpdate(newRelease.version)} />}
        {lost && <SyncLost />}
        {mismatch && shown && <VersionMismatch link={link} hasUpdate={!!newRelease} />}
        {toastAt && now - toastAt < TOAST_MS && <NewListingToast onClose={() => setToastAt(null)} />}
        {shown ? (
          <Applicants session={shown} lookups={lookups} seenAt={seenAt} dimmed={lost} now={now} />
        ) : (
          <div className={classes.body}>
            <Waiting link={link} />
          </div>
        )}
        {lost ? (
          <StatusBar tone="lost" label="Sync lost" detail={lastFrameAt ? `${ago(now - lastFrameAt)} ago` : undefined} right={<RetryButton onClick={() => invoke("retry_sync")} />} />
        ) : shown ? (
          <StatusBar
            tone={mismatch ? "lost" : "ok"}
            label={mismatch ? "Version mismatch" : "Synced"}
            detail={failedDetail ?? (pendingLookups ? `${pendingLookups} pending ${pendingLookups === 1 ? "lookup" : "lookups"}` : toastAt ? `new session ${ago(now - toastAt)} ago` : undefined)}
            right={
              avgIlvl ? (
                <span>
                  <span className={classes.label}>avg ilvl </span>
                  <span style={{ fontFamily: "var(--mantine-font-family-headings)", fontWeight: 700, fontSize: 12.5, color: "var(--pi-text-bright)" }}>{avgIlvl}</span>
                </span>
              ) : undefined
            }
          />
        ) : (
          <StatusBar tone={mismatch ? "lost" : "idle"} label={mismatch ? "Version mismatch" : "Waiting to sync"} right={<span className={classes.mono}>idle {pad(Math.floor((now - startedAt) / 60000))}:{pad(Math.floor(((now - startedAt) / 1000) % 60))}</span>} />
        )}
      </div>
    </>
  );
}
