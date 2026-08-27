import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const UPDATE_NOTIFICATION_ID = "service-worker-update";

/**
 * Registers the service worker that makes the app installable and lets it
 * open offline. Dev is left alone — a caching worker there only ever hides
 * the change you just made.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  // `controllerchange` also fires the first time a worker claims the page, so
  // only reload when the user actually asked for the waiting build.
  let updateAccepted = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateAccepted) return;
    updateAccepted = false;
    window.location.reload();
  });

  const promptForUpdate = (waiting: ServiceWorker) => {
    notifications.show({
      id: UPDATE_NOTIFICATION_ID,
      title: "Update available",
      autoClose: false,
      color: "accent",
      message: (
        <Group justify="space-between" wrap="nowrap" mt={6}>
          <Text size="sm">A newer version of PugInspect is ready.</Text>
          <Button
            size="compact-sm"
            onClick={() => {
              updateAccepted = true;
              notifications.hide(UPDATE_NOTIFICATION_ID);
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            Reload
          </Button>
        </Group>
      ),
    });
  };

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptForUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            // A worker reaching `installed` while one already controls the
            // page means a newer build is waiting behind this tab.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              promptForUpdate(installing);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
