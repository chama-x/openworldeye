import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** GitHub Pages project URL: https://chama-x.github.io/openworldeye/ */
const GITHUB_PAGES_BASE = "/openworldeye/";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? GITHUB_PAGES_BASE : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
