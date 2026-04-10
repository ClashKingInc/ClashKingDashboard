import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NEXT_PUBLIC_DISCORD_CLIENT_ID: "test_discord_client_id",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        // Thin wrappers with no logic — excluded from coverage in sonar-project.properties too
        "lib/api/clients/**",
        "lib/api/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
