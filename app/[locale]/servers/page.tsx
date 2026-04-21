"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { GuildInfo } from "@/lib/api/types/server";
import { ServersHeader } from "@/components/servers-header";

const ROLE_STYLES: Record<string, string> = {
  Owner: "bg-green-500/20 text-green-600 dark:text-green-400",
  Administrator: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  Manager: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  Owner: "roles.owner",
  Administrator: "roles.administrator",
  Manager: "roles.manager",
};

export default function ServersPage() {
  const t = useTranslations("ServersPage");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  useEffect(() => {
    const fetchGuilds = async () => {
      setPermissionMessage(null);
      setError(null);
      setLoading(true);

      try {
        // Check for prefetched guilds from auth callback
        const prefetched = sessionStorage.getItem('prefetched_guilds');
        if (prefetched) {
          try {
            const guildsData = JSON.parse(prefetched);
            setGuilds(guildsData);
            setLoading(false);
            sessionStorage.removeItem('prefetched_guilds'); // Clean up

            // Fetch fresh data in background
            const accessToken = localStorage.getItem("access_token");
            if (accessToken) {
              const response = await apiClient.servers.getGuilds();
              if (response.data) {
                const sortedGuilds = response.data.toSorted((a, b) => {
                  if (a.has_bot && !b.has_bot) return -1;
                  if (!a.has_bot && b.has_bot) return 1;
                  return a.name.localeCompare(b.name);
                });
                setGuilds(sortedGuilds);
              }
            }
            return;
          } catch (err) {
            console.error('Error parsing prefetched guilds:', err);
            // Fall through to normal fetch
          }
        }

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push(`/${locale}/login`);
          return;
        }


        // Fetch user's guilds using API client
        const response = await apiClient.servers.getGuilds();

        if (response.error || !response.data) {
          if (response.status === 401) {
            // Token expired or no permissions, show no servers message
            setPermissionMessage(t("noServers.description"));
            setGuilds([]);
            return;
          }
          throw new Error(response.error || "Failed to fetch guilds");
        }

        // Sort guilds: servers with bot first, then by name
        const sortedGuilds = response.data.toSorted((a, b) => {
          // Primary sort: has_bot (true first)
          if (a.has_bot && !b.has_bot) return -1;
          if (!a.has_bot && b.has_bot) return 1;

          // Secondary sort: alphabetically by name
          return a.name.localeCompare(b.name);
        });

        setGuilds(sortedGuilds);
      } catch (err) {
        console.error("Error fetching guilds:", err);
        setError(err instanceof Error ? err.message : "Failed to load servers");
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, [router, locale, t]);

  const getGuildIconUrl = (guild: GuildInfo) => {
    if (!guild.icon) return null;
    if (guild.icon.startsWith('https')) {
      return guild.icon;
    }
    else {
      return null;
    }
  };

  const handleGuildClick = (guild: GuildInfo) => {
    if (guild.has_bot) {
      sessionStorage.setItem(
        "selected_guild",
        JSON.stringify({
          id: guild.id,
          name: guild.name,
          icon: getGuildIconUrl(guild) || undefined,
        })
      );
      router.push(`/${locale}/dashboard/${guild.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ServersHeader />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ServersHeader />
        <Card className="max-w-md border-2 border-primary bg-card/95">
          <CardHeader>
            <CardTitle className="text-destructive">{t("error")}</CardTitle>
            <CardDescription className="text-muted-foreground">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/${locale}/login`)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {t("backToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <ServersHeader />

      <div className="relative container mx-auto px-4 pt-24 pb-8 sm:pt-32 sm:pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("description")}
            </p>
          </div>

          {/* Servers Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {guilds.map((guild) => (
              <Card
                key={guild.id}
                className={`border-2 bg-card/95 backdrop-blur transition-all duration-300 ${guild.has_bot
                  ? "border-border hover:border-primary hover:shadow-[0_0_10px_var(--primary)]/30 cursor-pointer"
                  : "border-border opacity-75"
                  } rounded-xl overflow-hidden`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6">
                  {/* Left side: avatar + info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <Avatar
                      className={`h-12 w-12 sm:h-16 sm:w-16 border-2 transition-transform duration-300 flex-shrink-0 ${guild.has_bot
                        ? "border-primary group-hover:scale-105"
                        : "border-border"
                        }`}
                    >
                      <AvatarImage src={getGuildIconUrl(guild) || undefined} />
                      <AvatarFallback className="text-xl sm:text-2xl bg-muted text-foreground">
                        {guild.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl text-foreground truncate">
                        {guild.name}
                      </CardTitle>

                      <CardDescription className="text-muted-foreground flex items-center gap-1 text-xs sm:text-sm">
                        <Users className="w-3 h-3" />
                        <span className="truncate">
                          {guild.member_count
                            ? `${guild.member_count.toLocaleString()} ${t("members")}`
                            : t("server")}
                        </span>
                      </CardDescription>

                      {/* Role badge */}
                      <div className="mt-1 sm:mt-2">
                        <span
                          className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full inline-block ${ROLE_STYLES[guild.role] ?? "bg-gray-500/20 text-muted-foreground"}`}
                        >
                          {ROLE_LABEL_KEYS[guild.role] ? t(ROLE_LABEL_KEYS[guild.role] as any) : guild.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: action button */}
                  <div className="flex-shrink-0">
                    {guild.has_bot ? (
                      <Button
                        onClick={() => handleGuildClick(guild)}
                        className="w-24 sm:w-28 bg-green-600 hover:bg-green-700 text-white cursor-pointer text-xs sm:text-sm h-9 sm:h-10"
                      >
                        {t("configure")}
                      </Button>
                    ) : (
                      <a
                        href={`https://discord.com/application-directory/824653933347209227?guild_id=${guild.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block"
                      >
                        <Button className="w-24 sm:w-28 bg-primary hover:bg-primary/90 text-white cursor-pointer text-xs sm:text-sm h-9 sm:h-10">
                          {t("invite")}
                        </Button>
                      </a>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {guilds.length === 0 && (
            <Card className="border-2 border-border bg-card/95 backdrop-blur">
              <CardHeader className="text-center py-12">
                <CardTitle className="text-foreground mb-2">{t("noServers.title")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {permissionMessage || t("noServers.description")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
