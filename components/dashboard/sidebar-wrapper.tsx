"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface SidebarWrapperProps {
  guildId: string;
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

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v2/server/${guildId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        // Discord CDN URL for guild icons
        const iconUrl = data.icon
          ? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png?size=128`
          : undefined;

        setServerInfo({
          name: data.name || "My Server",
          icon: iconUrl,
        });
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
