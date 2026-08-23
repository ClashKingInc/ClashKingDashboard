"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/components/auth-session-provider";
import { Sidebar } from "./sidebar";
import { MobileServerDropdown } from "./mobile-server-dropdown";
import type { GuildInfo } from "@/lib/api/types/server";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";

interface SidebarWrapperProps {
  readonly guildId: string;
  readonly locale: string;
  readonly variant?: "sidebar" | "mobile-header";
}

interface SidebarData {
  isLoading: boolean;
  serverInfo: {
    name: string;
    icon?: string;
  };
  availableGuilds: GuildInfo[];
}

const SidebarDataContext = createContext<SidebarData | null>(null);

interface CachedGuildInfo {
  id: string;
  name: string;
  icon?: string;
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

export function SidebarDataProvider({ guildId, children }: { readonly guildId: string; readonly children: ReactNode }) {
  const { status: authStatus } = useAuthSession();
  const storedGuild = useMemo(() => getStoredGuildInfo(guildId), [guildId]);
  const enabled = authStatus === "authenticated" && Boolean(guildId);

  const guildQuery = useQuery({
    ...dashboardQueryOptions.guild(guildId),
    enabled,
  });

  const guildsQuery = useQuery({
    ...dashboardQueryOptions.guilds(),
    enabled,
  });

  useEffect(() => {
    const guild = guildQuery.data;
    if (!guild) return;
    const icon = guild.icon?.startsWith("https") ? guild.icon : undefined;
    sessionStorage.setItem("selected_guild", JSON.stringify({
      id: guildId,
      name: guild.name || "My Server",
      icon,
    }));
  }, [guildId, guildQuery.data]);

  useEffect(() => {
    if (guildQuery.error) console.error("Failed to fetch server info:", { guildId, error: guildQuery.error });
  }, [guildId, guildQuery.error]);

  useEffect(() => {
    if (guildsQuery.error) console.error("Failed to fetch available guilds:", { guildId, error: guildsQuery.error });
  }, [guildId, guildsQuery.error]);

  const value = useMemo<SidebarData>(() => {
    const guild = guildQuery.data;
    const icon = guild?.icon?.startsWith("https") ? guild.icon : storedGuild?.icon;
    return {
      isLoading: !storedGuild && guildQuery.isPending,
      serverInfo: {
        name: guild?.name || storedGuild?.name || "My Server",
        icon,
      },
      availableGuilds: (guildsQuery.data ?? [])
        .filter((candidate: GuildInfo) => candidate.has_bot)
        .toSorted((a: GuildInfo, b: GuildInfo) => a.name.localeCompare(b.name)),
    };
  }, [guildQuery.data, guildQuery.isPending, guildsQuery.data, storedGuild]);
  return <SidebarDataContext.Provider value={value}>{children}</SidebarDataContext.Provider>;
}

export function SidebarWrapper({ guildId, locale, variant = "sidebar" }: SidebarWrapperProps) {
  const data = useContext(SidebarDataContext);
  if (!data) throw new Error("SidebarWrapper must be used inside SidebarDataProvider");
  const { isLoading, serverInfo, availableGuilds } = data;

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
