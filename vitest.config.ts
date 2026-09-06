import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { publicSeoCopyPlugin } from "./scripts/public-seo-copy-plugin";

export default defineConfig({
  plugins: [publicSeoCopyPlugin(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      VITE_CLASHKING_API_ORIGIN: "http://localhost:8000",
      VITE_DISCORD_CLIENT_ID: "test_discord_client_id",
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
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
