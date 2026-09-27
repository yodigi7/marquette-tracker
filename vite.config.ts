import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/marquette-tracker/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // The manifest's own icons are cached automatically. The tab icon and
      // favicon are not declared there, so name them explicitly to keep the
      // rule simple: every file `pnpm icons` produces is available offline.
      includeAssets: ["favicon.ico", "icon.svg"],
      manifest: {
        name: "Marquette Tracker",
        short_name: "Marquette",
        description:
          "Offline-first fertility tracker using the Marquette Method with the ClearBlue Fertility Monitor.",
        theme_color: "#0c0a09",
        background_color: "#fafaf9",
        display: "standalone",
        start_url: "./",
        scope: "./",
        lang: "en",
        categories: ["health", "lifestyle"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon-180x180.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
