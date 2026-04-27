import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // globe.gl (via react-globe.gl) can nest its own three; one copy avoids runtime
    // "Multiple instances of Three.js" and subtle WebGL bugs.
    dedupe: ["three"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      // ADSB.fi — proxied to avoid CORS
      "/api/adsb": {
        target: "https://opendata.adsb.fi",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adsb/, "/api/v2"),
      },
      // CelesTrak — proxied to avoid 403 (blocks browser Origin headers)
      "/api/celestrak": {
        target: "https://celestrak.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/celestrak/, "/NORAD/elements/gp.php"),
      },
      // ACLED OAuth + API — proxied to avoid CORS
      "/api/acled/token": {
        target: "https://acleddata.com",
        changeOrigin: true,
        rewrite: () => "/oauth/token",
      },
      "/api/acled/read": {
        target: "https://acleddata.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/acled\/read/, "/api/acled/read"),
      },
    },
  },
});
