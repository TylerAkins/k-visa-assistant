import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "features/**/*.ts", "db/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "lib/env.ts",
        "db/index.ts",
        "db/schema.ts",
        "features/auth/server/**",
        "features/auth/types/**",
      ],
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      // Global gates only — no per-file thresholds (avoids branch-chasing tests).
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
