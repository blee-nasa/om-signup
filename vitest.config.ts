import { defineConfig } from "vitest/config";

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
        "apps/api/src/index.ts",
        "apps/api/src/server.ts",
        "apps/web/src/main.tsx",
      ],
    },
  },
});
