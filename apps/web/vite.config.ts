import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev, proxy `/api/*` to the standalone API server (health lives at its
// root `/`, so we strip the `/api` prefix). In prod the single-app server
// mounts the API under `/api` directly, so the client URL is identical.
const apiPort = process.env.PORT ?? "3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "") || "/",
      },
    },
  },
});
