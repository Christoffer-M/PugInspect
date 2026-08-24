/**
 * `beforeinstallprompt` is Chromium-only and still not in lib.dom, so the
 * shape we depend on is declared here.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/*
 * Install state is held outside React, and bound from the app entry rather
 * than from a component.
 *
 * Chromium fires `beforeinstallprompt` once, shortly after load, and an event
 * missed because nothing was listening yet never comes back — the install
 * entry would simply never appear. Anything that binds from a component is too
 * late: the header lives behind a lazily loaded route chunk.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let version = 0;
let bound = false;

const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode media query.
    ("standalone" in window.navigator && window.navigator.standalone === true)
  );
}

export function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Chrome/Firefox on iOS are Safari underneath but cannot install to the home
  // screen, so only offer instructions to Safari proper.
  return isIos && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/** Call once, as early in startup as possible. */
export function listenForInstallPrompt() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  installed = isStandaloneDisplay();

  window.addEventListener("beforeinstallprompt", (event) => {
    // Without this Chromium shows its own mini-infobar instead of letting us
    // decide where the affordance lives.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });

  window.matchMedia("(display-mode: standalone)").addEventListener("change", (event) => {
    // Only ever latches on: the browser tab the install was started from keeps
    // reporting a non-standalone display.
    installed = installed || event.matches;
    emit();
  });
}

export function subscribeToInstallState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getInstallStateVersion = () => version;

export function getInstallState() {
  const needsManualInstructions = !installed && !deferredPrompt && isIosSafari();

  return {
    /** True when the app can be installed, either natively or by hand. */
    canInstall: !installed && (!!deferredPrompt || needsManualInstructions),
    needsManualInstructions,
    installed,
  };
}

/** Replays the browser's own prompt. Resolves true when the user accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false;

  const event = deferredPrompt;
  // The event is single-use — Chromium fires a fresh one if the user dismisses
  // it and the app remains eligible.
  deferredPrompt = null;
  emit();

  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
