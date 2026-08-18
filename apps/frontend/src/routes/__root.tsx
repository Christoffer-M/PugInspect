import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { config } from "../config";

const Analytics: React.FC = () => {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!config.umamiWebsiteId) {
      // VITE_UMAMI_WEBSITE_ID is baked in at build time; an empty value means
      // the build arg was missing and no analytics will be sent at all.
      console.warn("[analytics] VITE_UMAMI_WEBSITE_ID was empty at build time — tracking disabled");
      return;
    }
    const script = document.createElement("script");
    script.src = config.apiUrl + "/stats.js";
    script.defer = true;
    script.dataset.websiteId = config.umamiWebsiteId;
    // No data-host-url: events post to this origin's /api/send, which the
    // backend forwards to Umami — first-party so ad blockers don't drop them.
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

export const Route = createRootRoute({
  head: () => ({
    meta: [{ title: "PugInspect" }],
  }),
  component: () => (
    <>
      <HeadContent />
      <Analytics />
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackDevtools
          config={{ openHotkey: ["Control", "~"] }}
          plugins={[
            { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
            { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
          ]}
        />
      )}
    </>
  ),
});
