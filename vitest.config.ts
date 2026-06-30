import { defineConfig } from "vitest/config";

// Root config: runs both workspace projects (api + web) and coalesces their
// coverage into a single HTML/lcov report under .coverage/.
export default defineConfig({
  test: {
    projects: ["apps/api/vitest.config.ts", "apps/web/vitest.config.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./.coverage",
      include: ["apps/api/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "apps/api/src/index.ts", // listen() entry — not unit-testable
        "apps/api/src/server.ts", // prod entry — serves static SPA
        "apps/web/src/main.tsx", // bootstrap (createRoot + SW registration)
      ],
    },
  },
});
