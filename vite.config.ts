import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    vinext(),
    tailwindcss(),
    ...(command === "build"
      ? [
          cloudflare({
            viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
          }),
        ]
      : []),
  ],
}));
