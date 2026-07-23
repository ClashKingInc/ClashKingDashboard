"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  Gift,
  Check,
  ChevronDown,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Trophy,
  UserCog,
  TicketIcon,
  FileText,
  KeyRound,
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { GuildInfo } from "@/lib/api/types/server";
import { useDashboardAccess } from "./dashboard-access-provider";
import type { DashboardSection } from "@/lib/api/types/dashboard-access";

interface SidebarProps {
  readonly guildId: string;
  readonly locale: string;
  readonly guildName: string;
  readonly guildIcon?: string;
  readonly availableGuilds?: GuildInfo[];
  readonly isLoading?: boolean;
}

export function Sidebar({ guildId, locale, guildName, guildIcon, availableGuilds = [], isLoading = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const tNavigation = useTranslations("Navigation");
  const tCommon = useTranslations("Common");
  const { capabilities, canView } = useDashboardAccess();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectGuild = (guild: GuildInfo) => {
    const icon = guild.icon?.startsWith("https") ? guild.icon : undefined;
    sessionStorage.setItem("selected_guild", JSON.stringify({
      id: guild.id,
      name: guild.name,
      icon,
    }));
    setIsDropdownOpen(false);
    router.push(`/${locale}/dashboard/${guild.id}`);
  };

  const navigationSections: Array<{ titleKey: string | null; items: Array<{ nameKey: string; href: string; icon: React.ComponentType<{ className?: string }>; capability?: DashboardSection; fullAccess?: boolean }> }> = [
    {
      titleKey: null, // Overview - no section title
      items: [
        {
          nameKey: "overview.name",
          href: `/dashboard/${guildId}`,
          icon: Home,
        },
      ],
    },
    {
      titleKey: "sections.configuration",
      items: [
        {
          nameKey: "general.name",
          href: `/dashboard/${guildId}/general`,
          icon: Settings,
          capability: "settings",
        },
        {
          nameKey: "familySettings.name",
          href: `/dashboard/${guildId}/family-settings`,
          icon: UserCog,
          capability: "family_settings",
        },
        {
          nameKey: "logs.name",
          href: `/dashboard/${guildId}/logs`,
          icon: ScrollText,
          capability: "logs",
        },
        {
          nameKey: "dashboardAccess.name",
          href: `/dashboard/${guildId}/dashboard-access`,
          icon: KeyRound,
          fullAccess: true,
        },
      ],
    },
    {
      titleKey: "sections.clanManagement",
      items: [
        {
          nameKey: "clans.name",
          href: `/dashboard/${guildId}/clans`,
          icon: Users,
          capability: "clans",
        },
        {
          nameKey: "rosters.name",
          href: `/dashboard/${guildId}/rosters`,
          icon: ClipboardList,
          capability: "rosters",
        },
      ],
    },
    {
      titleKey: "sections.playerManagement",
      items: [
        {
          nameKey: "links.name",
          href: `/dashboard/${guildId}/links`,
          icon: Link2,
          capability: "links",
        },
        {
          nameKey: "bans.name",
          href: `/dashboard/${guildId}/bans-and-strikes`,
          icon: Ban,
          capability: "moderation",
        },
      ],
    },
    {
      titleKey: "sections.automation",
      items: [
        {
          nameKey: "roles.name",
          href: `/dashboard/${guildId}/roles`,
          icon: ShieldCheck,
          capability: "roles",
        },
        {
          nameKey: "reminders.name",
          href: `/dashboard/${guildId}/reminders`,
          icon: Bell,
          capability: "reminders",
        },
        {
          nameKey: "autoboards.name",
          href: `/dashboard/${guildId}/autoboards`,
          icon: LayoutDashboard,
          capability: "autoboards",
        },
        {
          nameKey: "giveaways.name",
          href: `/dashboard/${guildId}/giveaways`,
          icon: Gift,
          capability: "giveaways",
        },
        {
          nameKey: "panels.name",
          href: `/dashboard/${guildId}/panels`,
          icon: LayoutTemplate,
          capability: "panels",
        },
        {
          nameKey: "tickets.name",
          href: `/dashboard/${guildId}/tickets`,
          icon: TicketIcon,
          capability: "tickets",
        },
        {
          nameKey: "embeds.name",
          href: `/dashboard/${guildId}/embeds`,
          icon: FileText,
          capability: "embeds",
        },
      ],
    },
    {
      titleKey: "sections.statistics",
      items: [
        {
          nameKey: "wars.name",
          href: `/dashboard/${guildId}/wars`,
          icon: Swords,
          capability: "wars",
        },
        {
          nameKey: "leaderboards.name",
          href: `/dashboard/${guildId}/leaderboards`,
          icon: Trophy,
          capability: "leaderboards",
        },
      ],
    },
  ];

  const visibleNavigationSections = navigationSections
    .map((section) => ({ ...section, items: section.items.filter((item) => item.fullAccess ? capabilities?.full_access : !item.capability || canView(item.capability)) }))
    .filter((section) => section.items.length > 0);

  const normalizedPathname = pathname.replace(/^\/[a-z]{2}(?=\/)/, "").replace(/\/$/, "") || "/";

  const isNavItemActive = (href: string) => {
    const normalizedHref = href.replace(/\/$/, "") || "/";

    if (normalizedHref === `/dashboard/${guildId}`) {
      return normalizedPathname === normalizedHref;
    }

    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      <div className="hidden h-[72px] shrink-0 items-center border-b border-border px-3 md:flex">
        {isLoading ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 min-w-0 flex-1" />
          </div>
        ) : (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-10 w-10 shrink-0 rounded-xl border border-border">
                  <AvatarImage src={guildIcon} className="rounded-xl" />
                  <AvatarFallback className="rounded-xl bg-secondary text-base font-semibold text-primary">
                    {guildName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{guildName}</span>
                <ChevronDown className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              {(availableGuilds.length > 0 ? availableGuilds : [{
                id: guildId,
                name: guildName,
                icon: guildIcon ?? null,
                has_bot: true,
              } as GuildInfo]).map((guild) => (
                <DropdownMenuItem
                  key={guild.id}
                  onSelect={() => selectGuild(guild)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg py-2"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-border">
                    <AvatarImage src={guild.icon?.startsWith("https") ? guild.icon : undefined} className="rounded-lg" />
                    <AvatarFallback className="rounded-lg bg-secondary text-sm font-semibold text-primary">
                      {guild.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium">{guild.name}</span>
                  {guild.id === guildId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-custom flex-1 space-y-5 overflow-y-auto p-3">
        {visibleNavigationSections.map((section, sectionIndex) => (
          <div key={section.titleKey || `section-${sectionIndex}`}>
            {/* Section Title - only show if titleKey exists */}
            {section.titleKey && (
              <div className="mb-2 flex items-center gap-2 px-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                <h3 className="text-xs text-muted-foreground">
                  {t(section.titleKey)}
                </h3>
                <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
              </div>
            )}
            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.nameKey}
                    href={item.href}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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

      <div className="border-t border-border bg-card p-3">
        <Link
          href={`/dashboard/${guildId}/support-us`}
          className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] leading-none text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <span>{tCommon("poweredBy")}</span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            <Image
              src="/logos/bot-app-logo.png"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
            ClashKing
          </span>
        </Link>
      </div>
    </aside>
  );
}
