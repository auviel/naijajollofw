import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      all: false,
      include: ["lib/**/*.{ts,tsx}", "app/api/**/*.{ts,tsx}"],
      exclude: [
        "lib/**/*.d.ts",
        "lib/config/**",
        "lib/db/client.ts",
        "lib/db/repositories/**",
        "lib/integrations/**/config.ts",
        "**/node_modules/**",
        "**/generated/**",
      ],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
