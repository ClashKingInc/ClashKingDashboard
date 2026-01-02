"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { GuildInfo } from "@/lib/api/types/server";

export default function ServersPage() {
  const t = useTranslations("ServersPage");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push('/login');
          return;
        }

        // Set token for API client
        apiClient.setAccessToken(accessToken);

        // Fetch user's guilds using API client
        const response = await apiClient.servers.getGuilds();

        if (response.error || !response.data) {
          if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            router.push('/login');
            return;
          }
          throw new Error(response.error || "Failed to fetch guilds");
        }

        // Sort guilds: servers with bot first, then by name
        const sortedGuilds = response.data.sort((a, b) => {
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
  }, [router, locale]);

  const getGuildIconUrl = (guild: GuildInfo) => {
    console.log(guild);
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
      router.push(`/dashboard/${guild.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Card className="max-w-md border-2 border-[#DC2626] bg-[#1F1F1F]/95">
          <CardHeader>
            <CardTitle className="text-[#EF4444]">{t("error")}</CardTitle>
            <CardDescription className="text-gray-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/${locale}/login`)}
              className="w-full bg-[#DC2626] hover:bg-[#EF4444]"
            >
              {t("backToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#DC2626]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#F03529]/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToHome")}</span>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">
              {t("title")}
            </h1>
            <p className="text-gray-400">
              {t("description")}
            </p>
          </div>

          {/* Servers Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {guilds.map((guild) => (
              <Card
                key={guild.id}
                className={`border-2 bg-[#1F1F1F]/95 backdrop-blur transition-all duration-300 ${guild.has_bot
                  ? "border-[#2A2A2A] hover:border-[#DC2626] hover:shadow-[0_0_10px_#DC2626]/30 cursor-pointer"
                  : "border-[#2A2A2A] opacity-75"
                  } rounded-xl`}
                onClick={() => handleGuildClick(guild)}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  {/* Left side: avatar + info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar
                      className={`h-16 w-16 border-2 transition-transform duration-300 ${guild.has_bot
                        ? "border-[#DC2626] group-hover:scale-105"
                        : "border-[#2A2A2A]"
                        }`}
                    >
                      <AvatarImage src={getGuildIconUrl(guild) || undefined} />
                      <AvatarFallback className="text-2xl bg-[#2A2A2A] text-white">
                        {guild.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl text-white truncate">
                        {guild.name}
                      </CardTitle>

                      <CardDescription className="text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {guild.member_count
                          ? `${guild.member_count.toLocaleString()} ${t("members")}`
                          : t("server")}
                      </CardDescription>

                      {/* Role badge */}
                      <div className="mt-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${guild.role === "Owner"
                            ? "bg-green-500/20 text-green-400"
                            : guild.role === "Administrator"
                              ? "bg-blue-500/20 text-blue-400"
                              : guild.role === "Manager"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-300"
                            }`}
                        >
                          {guild.role === "Owner" ? t("roles.owner")
                            : guild.role === "Administrator" ? t("roles.administrator")
                            : guild.role === "Manager" ? t("roles.manager")
                            : guild.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: action button */}
                  {guild.has_bot ? (
                    <Button
                      className="w-28 bg-gray-700 text-white hover:bg-gray-600 cursor-pointer"
                    >
                      {t("configure")}
                    </Button>
                  ) : (
                    <a
                      href={`https://discord.com/application-directory/824653933347209227?guild_id=${guild.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button className="w-28 bg-[#DC2626] hover:bg-[#EF4444] text-white cursor-pointer">
                        {t("invite")}
                      </Button>
                    </a>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>

          {guilds.length === 0 && (
            <Card className="border-2 border-[#2A2A2A] bg-[#1F1F1F]/95 backdrop-blur">
              <CardHeader className="text-center py-12">
                <CardTitle className="text-white mb-2">{t("noServers.title")}</CardTitle>
                <CardDescription className="text-gray-400">
                  {t("noServers.description")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
