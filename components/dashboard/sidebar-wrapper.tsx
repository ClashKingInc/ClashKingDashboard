"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileServerDropdown } from "./mobile-server-dropdown";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import type { GuildInfo } from "@/lib/api/types/server";

interface SidebarWrapperProps {
  readonly guildId: string;
  readonly locale: string;
  readonly variant?: "sidebar" | "mobile-header";
}

interface CachedGuildInfo {
  id: string;
  name: string;
  icon?: string;
}

const GUILD_INFO_CACHE_TTL = 120000;
const GUILD_LIST_CACHE_KEY = "dashboard-guild-list";

function getGuildInfoCacheKey(guildId: string): string {
  return `guild-info-${guildId}`;
}

function getStoredGuildInfo(guildId: string): CachedGuildInfo | null {
  try {
    const stored = sessionStorage.getItem("selected_guild");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CachedGuildInfo> | null;
    if (parsed?.id !== guildId || typeof parsed?.name !== "string") {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      icon: typeof parsed.icon === "string" ? parsed.icon : undefined,
    };
  } catch {
    return null;
  }
}

export function SidebarWrapper({ guildId, locale, variant = "sidebar" }: SidebarWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [serverInfo, setServerInfo] = useState({
    name: "My Server",
    icon: undefined as string | undefined,
  });
  const [availableGuilds, setAvailableGuilds] = useState<GuildInfo[]>([]);

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const storedGuild = getStoredGuildInfo(guildId);
        if (storedGuild) {
          setServerInfo({
            name: storedGuild.name,
            icon: storedGuild.icon,
          });
          setIsLoading(false);
        }

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

        sessionStorage.setItem(
          "selected_guild",
          JSON.stringify({
            id: guildId,
            name: guild.name || "My Server",
            icon: iconUrl,
          })
        );

        try {
          const guilds = await apiCache.get(
            GUILD_LIST_CACHE_KEY,
            async () => {
              const response = await apiClient.servers.getGuilds();
              if (response.error || !response.data) {
                throw new Error(response.error || `Failed to fetch guilds (${response.status})`);
              }
              return response.data;
            },
            GUILD_INFO_CACHE_TTL
          );
          setAvailableGuilds(
            guilds
              .filter((candidate) => candidate.has_bot)
              .toSorted((a, b) => a.name.localeCompare(b.name))
          );
        } catch (error) {
          console.error("Failed to fetch available guilds:", { guildId, error });
        }
      } catch (error) {
        console.error("Failed to fetch server info:", { guildId, error });
      } finally {
        setIsLoading(false);
      }
    }

    fetchServerInfo();
  }, [guildId]);

  if (variant === "mobile-header") {
    return (
      <MobileServerDropdown
        locale={locale}
        guildName={serverInfo.name}
        guildIcon={serverInfo.icon}
        guildId={guildId}
        availableGuilds={availableGuilds}
        isLoading={isLoading}
      />
    );
  }

  return (
    <Sidebar
      guildId={guildId}
      locale={locale}
      guildName={serverInfo.name}
      guildIcon={serverInfo.icon}
      availableGuilds={availableGuilds}
      isLoading={isLoading}
    />
  );
}
