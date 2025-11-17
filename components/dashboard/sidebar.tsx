"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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
  LayoutDashboard,
  Link2,
  Trophy,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon?: string;
}

export function Sidebar({ guildId, guildName, guildIcon }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale || "en";

  const navigationSections = [
    {
      title: "Server Settings",
      items: [
        {
          name: "Overview",
          href: `/${locale}/dashboard/${guildId}`,
          icon: Home,
          description: "Dashboard home",
        },
        {
          name: "General Settings",
          href: `/${locale}/dashboard/${guildId}/general`,
          icon: Settings,
          description: "Server configuration",
        },
        {
          name: "Clans",
          href: `/${locale}/dashboard/${guildId}/clans`,
          icon: Users,
          description: "Manage your clans",
        },
        {
          name: "Logs",
          href: `/${locale}/dashboard/${guildId}/logs`,
          icon: ScrollText,
          description: "Webhook configuration",
        },
        {
          name: "Roles",
          href: `/${locale}/dashboard/${guildId}/roles`,
          icon: ShieldCheck,
          description: "Role automation",
        },
        {
          name: "Reminders",
          href: `/${locale}/dashboard/${guildId}/reminders`,
          icon: Bell,
          description: "All reminder types",
        },
        {
          name: "Rosters",
          href: `/${locale}/dashboard/${guildId}/rosters`,
          icon: ClipboardList,
          description: "Roster management",
        },
        {
          name: "Autoboards",
          href: `/${locale}/dashboard/${guildId}/autoboards`,
          icon: LayoutDashboard,
          description: "Automated leaderboards",
        },
        {
          name: "Links",
          href: `/${locale}/dashboard/${guildId}/links`,
          icon: Link2,
          description: "Player-Discord linking",
        },
        {
          name: "Bans",
          href: `/${locale}/dashboard/${guildId}/bans`,
          icon: Ban,
          description: "Moderation tools",
        },
      ],
    },
    {
      title: "Stats",
      items: [
        {
          name: "Wars",
          href: `/${locale}/dashboard/${guildId}/wars`,
          icon: Swords,
          description: "War statistics",
        },
        {
          name: "Leaderboards",
          href: `/${locale}/dashboard/${guildId}/leaderboards`,
          icon: Trophy,
          description: "Global rankings",
        },
      ],
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Server Header */}
      <div className="p-4 border-b border-border">
        <Link
          href="/servers"
          className="flex items-center gap-3 group transition-all duration-200"
        >
          <Avatar className="h-12 w-12 rounded-xl ring-2 ring-border transition-all group-hover:ring-4">
            <AvatarImage src={guildIcon} className="rounded-xl" />
            <AvatarFallback className="rounded-xl text-lg font-bold bg-secondary text-primary">
              {guildName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-base truncate text-foreground">
                {guildName}
              </p>
              <ChevronDown className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </div>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Dashboard Settings
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section Title */}
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            </div>
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-primary" />
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
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - ClashKing Branding & Theme Switcher */}
      <div className="p-4 border-t border-border bg-background space-y-3">
        {/* Theme Switcher */}
        <div className="flex justify-center">
          <ThemeSwitcher />
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            Powered by
          </div>
          <div className="text-xs font-bold text-primary">
            ClashKing
          </div>
        </div>
      </div>
    </div>
  );
}
