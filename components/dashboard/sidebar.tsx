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
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon?: string;
  isLoading?: boolean;
}

export function Sidebar({ guildId, guildName, guildIcon, isLoading = false }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale || "en";
  const t = useTranslations("Sidebar");
  const tCommon = useTranslations("Common");

  const navigationSections = [
    {
      titleKey: null, // Overview - no section title
      items: [
        {
          nameKey: "overview.name",
          href: `/${locale}/dashboard/${guildId}`,
          icon: Home,
        },
      ],
    },
    {
      titleKey: "sections.configuration",
      items: [
        {
          nameKey: "general.name",
          href: `/${locale}/dashboard/${guildId}/general`,
          icon: Settings,
        },
        {
          nameKey: "logs.name",
          href: `/${locale}/dashboard/${guildId}/logs`,
          icon: ScrollText,
        },
      ],
    },
    {
      titleKey: "sections.clanManagement",
      items: [
        {
          nameKey: "clans.name",
          href: `/${locale}/dashboard/${guildId}/clans`,
          icon: Users,
        },
        {
          nameKey: "rosters.name",
          href: `/${locale}/dashboard/${guildId}/rosters`,
          icon: ClipboardList,
        },
      ],
    },
    {
      titleKey: "sections.playerManagement",
      items: [
        {
          nameKey: "links.name",
          href: `/${locale}/dashboard/${guildId}/links`,
          icon: Link2,
        },
        {
          nameKey: "bans.name",
          href: `/${locale}/dashboard/${guildId}/bans`,
          icon: Ban,
        },
      ],
    },
    {
      titleKey: "sections.automation",
      items: [
        {
          nameKey: "roles.name",
          href: `/${locale}/dashboard/${guildId}/roles`,
          icon: ShieldCheck,
        },
        {
          nameKey: "reminders.name",
          href: `/${locale}/dashboard/${guildId}/reminders`,
          icon: Bell,
        },
        {
          nameKey: "autoboards.name",
          href: `/${locale}/dashboard/${guildId}/autoboards`,
          icon: LayoutDashboard,
        },
      ],
    },
    {
      titleKey: "sections.statistics",
      items: [
        {
          nameKey: "wars.name",
          href: `/${locale}/dashboard/${guildId}/wars`,
          icon: Swords,
        },
        {
          nameKey: "leaderboards.name",
          href: `/${locale}/dashboard/${guildId}/leaderboards`,
          icon: Trophy,
        },
      ],
    },
    {
      titleKey: "sections.system",
      items: [
        {
          nameKey: "botStats.name",
          href: `/${locale}/dashboard/${guildId}/bot-stats`,
          icon: Activity,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Server Header */}
      <div className="p-4 border-b border-border">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
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
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.titleKey || `section-${sectionIndex}`}>
            {/* Section Title - only show if titleKey exists */}
            {section.titleKey && (
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(section.titleKey)}
                </h3>
              </div>
            )}
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.nameKey}
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
                      <div className="truncate">{t(item.nameKey)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - ClashKing Branding & Theme/Language Switcher */}
      <div className="p-4 border-t border-border bg-background space-y-3">
        {/* Switchers */}
        <div className="flex justify-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            {tCommon("poweredBy")}
          </div>
          <div className="text-xs font-bold text-primary">
            ClashKing
          </div>
        </div>
      </div>
    </div>
  );
}
