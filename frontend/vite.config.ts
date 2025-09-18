import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tanstackRouter from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ autoCodeSplitting: true }), viteReact()],
});
