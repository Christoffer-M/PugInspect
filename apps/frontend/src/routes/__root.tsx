import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { config } from "../config";

const Analytics: React.FC = () => {
  useEffect(() => {
    if (import.meta.env.PROD && config.umamiWebsiteId) {
      const script = document.createElement("script");
      script.src = config.apiUrl + "/stats.js";
      script.defer = true;
      script.dataset.websiteId = config.umamiWebsiteId;
      script.dataset.hostUrl = "https://stats.puginspect.com";
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
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
