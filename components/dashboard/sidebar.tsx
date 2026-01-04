"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
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
  ChevronDown,
  LayoutDashboard,
  Link2,
  Trophy,
  Activity,
  LogOut,
  Server,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { UserInfo } from "@/lib/api/types/auth";

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon?: string;
  isLoading?: boolean;
}

export function Sidebar({ guildId, guildName, guildIcon, isLoading = false }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || "en";
  const t = useTranslations("Sidebar");
  const tCommon = useTranslations("Common");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push(`/${locale}`);
  };

  const navigationSections = [
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
        },
        {
          nameKey: "logs.name",
          href: `/dashboard/${guildId}/logs`,
          icon: ScrollText,
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
        },
        {
          nameKey: "rosters.name",
          href: `/dashboard/${guildId}/rosters`,
          icon: ClipboardList,
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
        },
        {
          nameKey: "bans.name",
          href: `/dashboard/${guildId}/bans`,
          icon: Ban,
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
        },
        {
          nameKey: "reminders.name",
          href: `/dashboard/${guildId}/reminders`,
          icon: Bell,
        },
        {
          nameKey: "autoboards.name",
          href: `/dashboard/${guildId}/autoboards`,
          icon: LayoutDashboard,
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
        },
        {
          nameKey: "leaderboards.name",
          href: `/dashboard/${guildId}/leaderboards`,
          icon: Trophy,
        },
      ],
    },
    {
      titleKey: "sections.system",
      items: [
        {
          nameKey: "botStats.name",
          href: `/dashboard/${guildId}/bot-stats`,
          icon: Activity,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Server Header */}
      <div className="border-b border-border">
        {isLoading ? (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ) : (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-4 cursor-pointer group transition-all duration-200 hover:bg-accent/50 outline-none">
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
                    <ChevronDown className={cn(
                      "h-4 w-4 opacity-60 group-hover:opacity-100 transition-all duration-200 text-muted-foreground",
                      isDropdownOpen && "rotate-180"
                    )} />
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={-10} alignOffset={10} className="w-56 bg-popover/95 backdrop-blur-md border-primary/30 shadow-2xl">
              {/* Switch Server */}
              <DropdownMenuItem asChild>
                <Link href="/servers" className="flex items-center gap-2 cursor-pointer py-2">
                  <Server className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t("switchServer")}</span>
                </Link>
              </DropdownMenuItem>

              {/* Go Home */}
              <DropdownMenuItem asChild>
                <Link href={`/${locale}`} className="flex items-center gap-2 cursor-pointer py-2">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t("goHome")}</span>
                </Link>
              </DropdownMenuItem>

              {/* User Info & Logout */}
              {user && (
                <>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={user.avatar_url} alt={user.username} />
                        <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground truncate">
                        {user.username}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
