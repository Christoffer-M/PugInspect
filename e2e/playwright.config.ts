import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  // GraphQL is mocked in the tests, so only the frontend runs.
  // Deliberately NOT `turbo dev`: turbo puts tasks in their own process groups, so Playwright's
  // shutdown kills turbo but leaks vite — the next run then reuses a stale server.
  webServer: {
    command: "pnpm run dev",
    cwd: "../apps/frontend",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
