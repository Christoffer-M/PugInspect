import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // No frontend tests yet — keeps root `pnpm test` green until the first one lands.
    passWithNoTests: true,
  },
});
