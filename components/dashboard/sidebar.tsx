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
  LogOut,
  Server,
  Sun,
  Moon,
  Computer,
  UserCog,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { UserInfo } from "@/lib/api/types/auth";
import { clashKingAssets } from "@/lib/theme";

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
  const tNav = useTranslations("Navigation");
  const tCommon = useTranslations("Common");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

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

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchLocale = (newLocale: string) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const languages = [
    { code: "en", name: "English", flagCode: "us" },
    { code: "fr", name: "Français", flagCode: "fr" },
    { code: "nl", name: "Nederlands", flagCode: "nl" },
  ];

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
          nameKey: "familySettings.name",
          href: `/dashboard/${guildId}/family-settings`,
          icon: UserCog,
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
              <DropdownMenuItem asChild className="focus:bg-muted/60 focus:text-primary hover:bg-muted/60 hover:text-primary transition-colors cursor-pointer">
                <Link href="/servers" className="flex items-center gap-2 py-2">
                  <Server className="h-4 w-4" />
                  <span className="font-medium">{t("switchServer")}</span>
                </Link>
              </DropdownMenuItem>

              {/* Go Home */}
              <DropdownMenuItem asChild className="focus:bg-muted/60 focus:text-primary hover:bg-muted/60 hover:text-primary transition-colors cursor-pointer">
                <Link href={`/${locale}`} className="flex items-center gap-2 py-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">{t("goHome")}</span>
                </Link>
              </DropdownMenuItem>

              {/* User Info & Logout */}
              {user && (
                <>
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
                      className="h-8 w-8 text-muted-foreground hover:bg-muted/60 hover:text-primary"
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

      {/* Footer - ClashKing Branding & Settings */}
      <div className="p-4 border-t border-border bg-background space-y-3">
        {/* Settings Button */}
        <div className="flex justify-center">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="border-border h-10 w-10">
                <Settings className="h-5 w-5" />
                <span className="sr-only">{tNav("settings")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-2xl" sideOffset={4}>
              {/* Theme Submenu */}
              <DropdownMenuSub open={openSubmenu === "theme"} onOpenChange={(open) => setOpenSubmenu(open ? "theme" : null)}>
                <DropdownMenuSubTrigger className="flex items-center space-x-2 hover:bg-accent/50 cursor-pointer">
                  {mounted && theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Computer className="h-4 w-4" />
                  )}
                  <span className="hover:text-primary">{tNav("theme")}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
                  <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className={`flex items-center space-x-2 hover:bg-accent/50 cursor-pointer ${
                      theme === "system" ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <Computer className="h-4 w-4" />
                    <span className="hover:text-primary">{tNav("systemTheme")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className={`flex items-center space-x-2 hover:bg-accent/50 cursor-pointer ${
                      theme === "light" ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    <span className="hover:text-primary">{tNav("lightTheme")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className={`flex items-center space-x-2 hover:bg-accent/50 cursor-pointer ${
                      theme === "dark" ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    <span className="hover:text-primary">{tNav("darkTheme")}</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Language Submenu */}
              <DropdownMenuSub open={openSubmenu === "language"} onOpenChange={(open) => setOpenSubmenu(open ? "language" : null)}>
                <DropdownMenuSubTrigger className="flex items-center space-x-2 hover:bg-accent/50 cursor-pointer">
                  <div className="relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
                    <Image
                      src={`https://flagcdn.com/w40/${languages.find(lang => lang.code === locale)?.flagCode || "us"}.png`}
                      alt="Current language"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="hover:text-primary">{tNav("language")}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => switchLocale(lang.code)}
                      className={`flex items-center space-x-2 hover:bg-accent/50 cursor-pointer ${
                        locale === lang.code ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <div className="mr-2 relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
                        <Image
                          src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                          alt={lang.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="hover:text-primary">{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{tCommon("poweredBy")}</span>
          <Image
            src={clashKingAssets.logos.crownRed}
            alt="ClashKing"
            width={16}
            height={16}
            className="h-4 w-4"
            unoptimized
          />
          <span className="text-xs font-bold text-primary">ClashKing</span>
        </div>
      </div>
    </div>
  );
}
