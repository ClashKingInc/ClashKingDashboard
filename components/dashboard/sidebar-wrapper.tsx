"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface SidebarWrapperProps {
  guildId: string;
}

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  has_bot: boolean;
}

export function SidebarWrapper({ guildId }: SidebarWrapperProps) {
  const [serverInfo, setServerInfo] = useState({
    name: "My Server",
    icon: undefined as string | undefined,
  });

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        // Fetch all guilds and find the one matching guildId
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v2/guilds`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        if (!response.ok) return;

        const guilds: GuildInfo[] = await response.json();

        // Find the guild matching our guildId
        const currentGuild = guilds.find((g) => g.id === guildId);

        if (currentGuild) {
          // Icon URL is already provided by the backend as a full URL
          const iconUrl = currentGuild.icon?.startsWith('https')
            ? currentGuild.icon
            : undefined;

          setServerInfo({
            name: currentGuild.name || "My Server",
            icon: iconUrl,
          });
        }
      } catch (error) {
        console.error("Failed to fetch server info:", error);
      }
    }

    fetchServerInfo();
  }, [guildId]);

  return (
    <Sidebar
      guildId={guildId}
      guildName={serverInfo.name}
      guildIcon={serverInfo.icon}
    />
  );
}
