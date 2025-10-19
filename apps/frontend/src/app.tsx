import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { notifications, Notifications } from "@mantine/notifications";

// Import the generated route tree
import { routeTree } from "./routeTree.gen.ts";

import reportWebVitals from "./reportWebVitals.ts";

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
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  },
});

const theme = createTheme({
  primaryColor: "gray",
});

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  console.log("ENV:", import.meta.env);
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
