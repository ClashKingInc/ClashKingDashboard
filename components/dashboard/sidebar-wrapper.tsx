"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";

interface SidebarWrapperProps {
  guildId: string;
}

export function SidebarWrapper({ guildId }: SidebarWrapperProps) {
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
        const guild = await apiCache.get(
          `guild-info-${guildId}`,
          async () => {
            const response = await apiClient.servers.getGuild(guildId);

            if (response.error || !response.data) {
              throw new Error(response.error || "Failed to fetch guild info");
            }

            return response.data;
          }
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
      guildName={serverInfo.name}
      guildIcon={serverInfo.icon}
      isLoading={isLoading}
    />
  );
}
