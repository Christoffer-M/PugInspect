import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { useEffect } from "react";

const Analytics: React.FC = () => {
  useEffect(() => {
    if (import.meta.env.PROD) {
      const script = document.createElement("script");
      script.src =
        "https://puginspect-backend-8fde8e3dd345.herokuapp.com/stats.js";
      script.defer = true;
      script.dataset.websiteId = "92e835c5-3bbb-43a8-a358-5049b60d3b8c";
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
      <TanstackDevtools
        config={{
          position: "bottom-left",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  ),
});
