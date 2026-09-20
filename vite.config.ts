import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { publicSeoCopyPlugin } from "./scripts/public-seo-copy-plugin";

const LOCAL_TUNNEL_HOST = "local-dash.clashk.ing";

export default defineConfig(() => {
  const tunnelHost = process.env.CLASHKING_LOCAL_DASHBOARD_HOST?.trim();
  if (tunnelHost && tunnelHost !== LOCAL_TUNNEL_HOST) {
    throw new Error(`CLASHKING_LOCAL_DASHBOARD_HOST must be ${LOCAL_TUNNEL_HOST}`);
  }

  return {
    build: {
      manifest: true,
    },
    server: {
      host: "127.0.0.1",
      port: 3002,
      allowedHosts: ["dev-dash.clashk.ing", ...(tunnelHost ? [tunnelHost] : [])],
      fs: {
        strict: true,
        deny: ["**/.env*", "**/.dev.vars*", "**/.git/**", "**/*.{crt,key,pem}"],
      },
      ...(tunnelHost ? {
        hmr: {
          host: tunnelHost,
          protocol: "wss" as const,
          clientPort: 443,
        },
      } : {}),
    },
    plugins: [
      publicSeoCopyPlugin(),
      react(),
      tailwindcss(),
      cloudflare({ inspectorPort: tunnelHost ? false : undefined }),
    ],
    resolve: {
      alias: {
        "@": import.meta.dirname,
      },
    },
  };
});
