"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Check, ChevronDown, TriangleAlert } from "lucide-react";
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
import { dashboardHref } from "@/lib/dashboard-route";
import { dashboardNavigationSections } from "./dashboard-navigation";
import { InactiveServerDialog } from "./inactive-server-dialog";

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
  const { capabilities, canView } = useDashboardAccess();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inactiveGuild, setInactiveGuild] = useState<GuildInfo | null>(null);
  const selectGuild = (guild: GuildInfo) => {
    if (guild.inactive) {
      setIsDropdownOpen(false);
      setInactiveGuild(guild);
      return;
    }
    const icon = guild.icon?.startsWith("https") ? guild.icon : undefined;
    sessionStorage.setItem("selected_guild", JSON.stringify({
      id: guild.id,
      name: guild.name,
      icon,
    }));
    setIsDropdownOpen(false);
    router.push(dashboardHref("", guild.id));
  };

  const visibleNavigationSections = dashboardNavigationSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.fullAccess ? capabilities?.full_access : !item.capability || canView(item.capability))
        .map((item) => ({ ...item, href: dashboardHref(item.path, guildId) })),
    }))
    .filter((section) => section.items.length > 0);

  const normalizedPathname = pathname.replace(/^\/[a-z]{2}(?=\/)/, "").replace(/\/$/, "") || "/";

  const isNavItemActive = (href: string) => {
    const normalizedHref = new URL(href, "https://dash.clashk.ing").pathname.replace(/\/$/, "") || "/";

    if (normalizedHref === "/dashboard") {
      return normalizedPathname === normalizedHref;
    }

    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card lg:w-72">
      <div className="hidden h-[72px] shrink-0 items-center border-b border-border px-3 lg:flex">
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
                  {guild.inactive && (
                    <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-label={t("inactiveServer")} />
                  )}
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
                    prefetch={false}
                    onMouseEnter={() => router.prefetch(item.href)}
                    onFocus={() => router.prefetch(item.href)}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150",
                      item.desktopOnly && "hidden lg:flex",
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
          href={dashboardHref("support-us", guildId)}
          prefetch={false}
          className="group flex min-h-10 items-center justify-between rounded-xl bg-muted/55 px-3 py-2 text-sm font-semibold text-foreground shadow-sm shadow-black/5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2.5">
            <span className="relative h-7 w-6 shrink-0 overflow-hidden" aria-hidden="true">
              <Image
                src="/concepts/clashking-wordmark-light.svg"
                alt=""
                width={101}
                height={28}
                className="absolute left-0 top-0 h-7 w-auto max-w-none dark:hidden"
              />
              <Image
                src="/concepts/clashking-wordmark-dark.svg"
                alt=""
                width={101}
                height={28}
                className="absolute left-0 top-0 hidden h-7 w-auto max-w-none dark:block"
              />
            </span>
            <span>{tNavigation("support")}</span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
        </Link>
      </div>
      <InactiveServerDialog
        guild={inactiveGuild}
        locale={locale}
        onClose={() => setInactiveGuild(null)}
        onReactivated={(guild) => {
          setInactiveGuild(null);
          selectGuild(guild);
        }}
      />
    </aside>
  );
}
