import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { publicSeoCopyPlugin } from "./scripts/public-seo-copy-plugin";

export default defineConfig(() => {
  const tunnelHost = process.env.CLASHKING_LOCAL_DASHBOARD_HOST?.trim();
  if (tunnelHost && (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(tunnelHost) || ["dash.clashk.ing", "api.clashk.ing"].includes(tunnelHost.toLowerCase()))) {
    throw new Error("CLASHKING_LOCAL_DASHBOARD_HOST must be a development hostname, without https:// or a path");
  }
  if (tunnelHost) {
    const discordClientId = process.env.VITE_DISCORD_CLIENT_ID?.trim();
    if (!/^\d{17,20}$/.test(discordClientId ?? "") || discordClientId === "824653933347209227") {
      throw new Error("Set VITE_DISCORD_CLIENT_ID to your Discord test application's ID");
    }
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
