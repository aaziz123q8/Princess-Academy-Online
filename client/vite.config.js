import { defineConfig } from "vite";

// Vite config for the Princess Academy Online client.
// `base: "./"` produces relative asset paths so the built `dist/` folder can be
// uploaded to any subdirectory on Hostinger (e.g. public_html/game/) and just work.
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    // In dev, proxy API + websocket to the local Node backend so the client can
    // call same-origin paths (/api, /ws) both in dev and in production.
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
  build: {
    target: "es2020",
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
});
