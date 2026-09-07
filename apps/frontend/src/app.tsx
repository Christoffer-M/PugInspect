import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@repo/ui/globals.css";
import "./globals.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { notifications, Notifications } from "@mantine/notifications";

// Import the generated route tree
import { routeTree } from "./routeTree.gen.ts";


import { MantineProvider } from "@mantine/core";
import { theme } from "@repo/ui";
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

// Render the app
const rootElement = document.getElementById("app");
// Deliberately not guarded on an empty container: crawler HTML ships a text
// summary inside #app (see backend seo/characterMeta.ts), and a JS-capable
// client that receives it must still mount. createRoot clears the container,
// so the summary is replaced by the real page rather than duplicated.
if (rootElement) {
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
