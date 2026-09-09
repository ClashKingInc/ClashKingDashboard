import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { publicSeoCopyPlugin } from "./scripts/public-seo-copy-plugin";

export default defineConfig({
  build: {
    manifest: true,
  },
  server: {
    host: "127.0.0.1",
    port: 3002,
    allowedHosts: ["dev-dash.clashk.ing"],
  },
  plugins: [
    publicSeoCopyPlugin(),
    react(),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
