"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { apiClient } from "@/lib/api/client";

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

        // Set token for API client
        apiClient.setAccessToken(token);

        // Fetch guild info using the dedicated endpoint
        console.log(`🔍 Fetching guild info for guildId: ${guildId}`);
        const response = await apiClient.servers.getGuild(guildId);

        if (response.error || !response.data) {
          console.error("Failed to fetch guild info:", {
            guildId,
            error: response.error,
            status: response.status,
            fullResponse: response
          });
          setIsLoading(false);
          return;
        }

        const guild = response.data;

        // Icon URL is already provided by the backend as a full URL
        const iconUrl = guild.icon?.startsWith('https')
          ? guild.icon
          : undefined;

        setServerInfo({
          name: guild.name || "My Server",
          icon: iconUrl,
        });
      } catch (error) {
        console.error("Failed to fetch server info:", error);
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
