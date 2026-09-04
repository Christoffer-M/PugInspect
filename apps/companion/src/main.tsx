import "@mantine/core/styles.css";
import "@repo/ui/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { theme } from "@repo/ui";
import App from "./App";
import { startHeartbeat } from "./analytics";

if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) await import("./devMock");

startHeartbeat();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
