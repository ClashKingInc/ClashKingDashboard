"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  role: "Owner" | "Administrator" | "Manager" | "Member";
  features: string[];
}

interface GuildWithBot extends DiscordGuild {
  has_bot: boolean;
  member_count?: number;
}

export default function ServersPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<GuildWithBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push("/login");
          return;
        }

        // Fetch user's guilds with bot presence from our backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error("API URL is not set in environment variables.");
        }

        const response = await fetch(`${apiUrl}/v2/guilds`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch guilds");
        }

        const guildsData: GuildWithBot[] = await response.json();

        // Sort guilds: servers with bot first, then by name
        const sortedGuilds = guildsData.sort((a, b) => {
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
  }, [router]);

  const getGuildIconUrl = (guild: DiscordGuild) => {
    console.log(guild);
    if (!guild.icon) return null;
    if (guild.icon.startsWith('https')) {
      return guild.icon;
    }
    else {
      return null;
    }
  };

  const handleGuildClick = (guild: GuildWithBot) => {
    if (guild.has_bot) {
      router.push(`/en/dashboard/${guild.id}`);
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
            <CardTitle className="text-[#EF4444]">Error</CardTitle>
            <CardDescription className="text-gray-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-[#DC2626] hover:bg-[#EF4444]"
            >
              Back to Login
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
              href="/en"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">
              Select a Server
            </h1>
            <p className="text-gray-400">
              Choose a server to configure ClashKing bot settings
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
                          ? `${guild.member_count.toLocaleString()} members`
                          : "Server"}
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
                          {guild.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: action button */}
                  {guild.has_bot ? (
                    <Button
                      className="w-28 bg-gray-700 text-white hover:bg-gray-600 cursor-pointer"
                    >
                      Configure
                    </Button>
                  ) : (
                    <a
                      href={`https://discord.com/application-directory/824653933347209227?guild_id=${guild.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button className="w-28 bg-[#DC2626] hover:bg-[#EF4444] text-white cursor-pointer">
                        Invite
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
                <CardTitle className="text-white mb-2">No Servers Found</CardTitle>
                <CardDescription className="text-gray-400">
                  You don't have admin permissions in any Discord servers.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
