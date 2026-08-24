import { useSyncExternalStore } from "react";
import {
  getInstallState,
  getInstallStateVersion,
  promptInstall,
  subscribeToInstallState,
} from "../pwa/installPrompt";

/**
 * Reads the install state captured at startup by `listenForInstallPrompt`.
 *
 * Chromium hands us an event we can replay as a native install prompt; iOS
 * Safari has no such API and needs the user walked through the Share sheet.
 */
export function useInstallPrompt() {
  useSyncExternalStore(subscribeToInstallState, getInstallStateVersion, () => 0);

  return { ...getInstallState(), promptInstall };
}
