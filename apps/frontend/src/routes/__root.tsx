import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { config } from "../config ";

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
  component: () => (
    <>
      <Analytics />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </>
  ),
});
