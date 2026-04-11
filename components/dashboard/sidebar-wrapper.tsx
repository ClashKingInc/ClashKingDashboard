"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";

interface SidebarWrapperProps {
  readonly guildId: string;
  readonly locale: string;
}

const GUILD_INFO_CACHE_TTL = 120000;

function getGuildInfoCacheKey(guildId: string): string {
  return `guild-info-${guildId}`;
}

export function SidebarWrapper({ guildId, locale }: SidebarWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [serverInfo, setServerInfo] = useState({
    name: "My Server",
    icon: undefined as string | undefined,
  });

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setIsLoading(false);
          return;
        }
        // Only cache successful guild responses; ApiResponse errors are resolved values.
        const guild = await apiCache.get(
          getGuildInfoCacheKey(guildId),
          async () => {
            const response = await apiClient.servers.getGuild(guildId);

            if (response.error || !response.data) {
              throw new Error(response.error || `Failed to fetch guild info (${response.status})`);
            }

            return response.data;
          },
          GUILD_INFO_CACHE_TTL
        );

        // Icon URL is already provided by the backend as a full URL
        const iconUrl = guild.icon?.startsWith('https')
          ? guild.icon
          : undefined;

        setServerInfo({
          name: guild.name || "My Server",
          icon: iconUrl,
        });
      } catch (error) {
        console.error("Failed to fetch server info:", { guildId, error });
      } finally {
        setIsLoading(false);
      }
    }

    fetchServerInfo();
  }, [guildId]);

  return (
    <Sidebar
      guildId={guildId}
      locale={locale}
      guildName={serverInfo.name}
      guildIcon={serverInfo.icon}
      isLoading={isLoading}
    />
  );
}
