"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Settings,
  Users,
  Swords,
  ScrollText,
  ShieldCheck,
  Bell,
  ClipboardList,
  Ban,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { darkTheme, clashKingColors } from "@/lib/theme";

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon?: string;
}

export function Sidebar({ guildId, guildName, guildIcon }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Overview",
      href: `/${guildId}`,
      icon: Home,
      description: "Dashboard home",
    },
    {
      name: "General Settings",
      href: `/${guildId}/general`,
      icon: Settings,
      description: "Server configuration",
    },
    {
      name: "Clans",
      href: `/${guildId}/clans`,
      icon: Users,
      description: "Manage your clans",
    },
    {
      name: "Wars",
      href: `/${guildId}/wars`,
      icon: Swords,
      description: "War stats & reminders",
    },
    {
      name: "Logs",
      href: `/${guildId}/logs`,
      icon: ScrollText,
      description: "Webhook configuration",
    },
    {
      name: "Roles",
      href: `/${guildId}/roles`,
      icon: ShieldCheck,
      description: "Role automation",
    },
    {
      name: "Reminders",
      href: `/${guildId}/reminders`,
      icon: Bell,
      description: "All reminder types",
    },
    {
      name: "Rosters",
      href: `/${guildId}/rosters`,
      icon: ClipboardList,
      description: "Roster management",
    },
    {
      name: "Bans",
      href: `/${guildId}/bans`,
      icon: Ban,
      description: "Moderation tools",
    },
  ];

  return (
    <div
      className="flex h-full w-64 flex-col border-r"
      style={{
        backgroundColor: darkTheme.background.secondary,
        borderColor: darkTheme.border.primary,
      }}
    >
      {/* Server Header */}
      <div
        className="p-4 border-b"
        style={{
          borderColor: darkTheme.border.primary,
        }}
      >
        <Link
          href="/servers"
          className="flex items-center gap-3 group transition-all duration-200"
        >
          <Avatar
            className="h-12 w-12 rounded-xl ring-2 transition-all group-hover:ring-4"
            style={{
              ringColor: darkTheme.border.secondary,
            }}
          >
            <AvatarImage src={guildIcon} className="rounded-xl" />
            <AvatarFallback
              className="rounded-xl text-lg font-bold"
              style={{
                backgroundColor: darkTheme.background.tertiary,
                color: clashKingColors.primary,
              }}
            >
              {guildName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p
                className="font-semibold text-base truncate"
                style={{ color: darkTheme.text.primary }}
              >
                {guildName}
              </p>
              <ChevronDown
                className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ color: darkTheme.text.secondary }}
              />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: darkTheme.text.tertiary }}
            >
              Dashboard Settings
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive ? "shadow-sm" : ""
              )}
              style={{
                backgroundColor: isActive
                  ? `${clashKingColors.primary}15`
                  : 'transparent',
                color: isActive
                  ? clashKingColors.primary
                  : darkTheme.text.secondary,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = darkTheme.background.tertiary;
                  e.currentTarget.style.color = darkTheme.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = darkTheme.text.secondary;
                }
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                  style={{ backgroundColor: clashKingColors.primary }}
                />
              )}

              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  isActive ? "ml-1" : ""
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.name}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer - ClashKing Branding */}
      <div
        className="p-4 border-t"
        style={{
          borderColor: darkTheme.border.primary,
          backgroundColor: darkTheme.background.primary,
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <div
            className="text-xs font-medium"
            style={{ color: darkTheme.text.tertiary }}
          >
            Powered by
          </div>
          <div
            className="text-xs font-bold"
            style={{ color: clashKingColors.primary }}
          >
            ClashKing
          </div>
        </div>
      </div>
    </div>
  );
}
