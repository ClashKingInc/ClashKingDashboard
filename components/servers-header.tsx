"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Home, Settings, Sun, Moon, Computer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "next-themes";
import { clashKingAssets } from "@/lib/theme";
import type { UserInfo } from "@/lib/api/types/auth";
import { logout } from "@/lib/auth/logout";

export function ServersHeader() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const params = useParams();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const locale = (params?.locale as string) || "en";
  const t = useTranslations();

  useEffect(() => {
    setMounted(true);
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
    logout();
    setUser(null);
    router.push(`/${locale}`);
  };

  const SettingsDropdown = ({ align = "end" }: { align?: "start" | "end" }) => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const t = useTranslations("Navigation");

    useEffect(() => {
      setMounted(true);
    }, []);

    const switchLocale = (newLocale: string) => {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    };

    const languages = [
      { code: "en", name: "English", flagCode: "us" },
      { code: "fr", name: "Français", flagCode: "fr" },
      { code: "nl", name: "Nederlands", flagCode: "nl" },
    ];

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="border-border h-12 w-12 md:h-9 md:w-9 [&_svg]:size-6 md:[&_svg]:size-5">
            <Settings />
            <span className="sr-only">{t("settings")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-48 bg-popover border border-border shadow-2xl" sideOffset={4} alignOffset={0}>
          {/* Theme Submenu */}
          <DropdownMenuSub open={openSubmenu === "theme"} onOpenChange={(open) => setOpenSubmenu(open ? "theme" : null)}>
            <DropdownMenuSubTrigger className="flex items-center space-x-2 hover:!bg-transparent cursor-pointer">
              {mounted && theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Computer className="h-4 w-4" />
              )}
              <span className="hover:!text-primary">{t("theme")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
              <DropdownMenuItem
                onClick={() => setTheme("system")}
                className={`flex items-center space-x-2 hover:!bg-transparent cursor-pointer ${
                  theme === "system" ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Computer className="h-4 w-4" />
                <span className="hover:!text-primary">{t("systemTheme")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={`flex items-center space-x-2 hover:!bg-transparent cursor-pointer ${
                  theme === "light" ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Sun className="h-4 w-4" />
                <span className="hover:!text-primary">{t("lightTheme")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={`flex items-center space-x-2 hover:!bg-transparent cursor-pointer ${
                  theme === "dark" ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Moon className="h-4 w-4" />
                <span className="hover:!text-primary">{t("darkTheme")}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Language Submenu */}
          <DropdownMenuSub open={openSubmenu === "language"} onOpenChange={(open) => setOpenSubmenu(open ? "language" : null)}>
            <DropdownMenuSubTrigger className="flex items-center space-x-2 hover:!bg-transparent cursor-pointer">
              <div className="relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
                <Image
                  src={`https://flagcdn.com/w40/${languages.find(lang => lang.code === locale)?.flagCode || "us"}.png`}
                  alt="Current language"
                  fill
                  sizes="20px"
                  className="object-cover"
                />
              </div>
              <span className="hover:!text-primary">{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => switchLocale(lang.code)}
                  className={`flex items-center space-x-2 hover:!bg-transparent cursor-pointer ${
                    locale === lang.code ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <div className="mr-2 relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
                    <Image
                      src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                      alt={lang.name}
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </div>
                  <span className="hover:!text-primary">{lang.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const logoSrc = mounted && (theme === "light" || resolvedTheme === "light")
    ? clashKingAssets.logos.withTextWhitePng
    : clashKingAssets.logos.withTextDarkPng;

  if (!user) {
    return null; // Don't show header if no user
  }

  return (
    <nav className="fixed top-0 inset-x-0 bg-card/95 backdrop-blur-lg z-50 border-b border-primary/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src={logoSrc}
              alt="ClashKing Logo"
              width={100}
              height={100}
              className="h-7 w-auto"
              priority
            />
          </Link>

          {/* Right side: Settings, User */}
          <div className="flex items-center space-x-4">
            <SettingsDropdown />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center space-x-2 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-0 outline-none">
                  <Avatar className="h-6 w-6 border border-primary/50">
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-foreground font-medium text-sm">{user.username}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-2xl" sideOffset={4}>
                <DropdownMenuItem asChild className="hover:!bg-transparent">
                  <Link href="/" className="flex items-center space-x-2">
                    <Home className="h-4 w-4" />
                    <span className="hover:!text-primary">{t("Sidebar.goHome")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 hover:!bg-transparent">
                  <LogOut className="h-4 w-4 text-destructive" />
                  <span className="hover:!text-primary">{t("Navigation.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
