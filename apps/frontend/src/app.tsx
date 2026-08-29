import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { notifications, Notifications } from "@mantine/notifications";

// Import the generated route tree
import { routeTree } from "./routeTree.gen.ts";


import { createTheme, MantineProvider } from "@mantine/core";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create a QueryClient instance
const queryClient = new QueryClient({

  queryCache: new QueryCache({
    onError: (error, query) => {
      // Queries that render their errors inline (e.g. roster chunks) opt out
      // of the global toast - a 30-man roster would otherwise fire 3 of them.
      if (query.meta?.suppressErrorToast) return;
      console.error("Global query error:", error, "on", query.queryKey);
      notifications.show({
        title: "Error",
        message: `${error instanceof Error ? error.message : String(error)}`,
        color: "red",
      });
    },
  }),
  defaultOptions: {

    queries: {
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  },
});

const theme = createTheme({
  primaryColor: "accent",
  primaryShade: { dark: 5, light: 6 },
  colors: {
    accent: [
      "#f0eeff",
      "#dbd5f8",
      "#c5bcf2",
      "#afa3ec",
      "#9b91e0",
      "#8b7fd4",
      "#7a6ec0",
      "#6a5eac",
      "#584e98",
      "#463d80",
    ],
    dark: [
      "#c9d1e0",
      "#a8b4c8",
      "#8a96aa",
      "#6b7590",
      "#3d4f6e",
      "#253354",
      "#0f1d35",
      "#080e1c",
      "#040a14",
      "#020609",
    ],
  },
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "Space Grotesk, system-ui, sans-serif",
  },
  components: {
    Paper: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          borderColor: "rgba(61, 79, 110, 0.5)",
          background: "linear-gradient(180deg, rgba(18,30,54,0.55) 0%, rgba(10,18,34,0.75) 100%)",
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        color: "accent",
      },
    },
    AppShell: {
      styles: {
        root: { background: "transparent" },
        main: { background: "transparent" },
      },
    },
  },
});

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="dark" theme={theme}>
          <Notifications />
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
