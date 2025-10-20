import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { devtools } from "@tanstack/devtools-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
  ],
  server: {
    watch: {
      usePolling: true,
    },
  },
});
