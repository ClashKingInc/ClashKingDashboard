"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "next-themes";
import { clashKingAssets } from "@/lib/theme";
import type { UserInfo } from "@/lib/api/types/auth";

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
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push(`/${locale}`);
  };

  const logoSrc = mounted && (theme === "light" || resolvedTheme === "light")
    ? clashKingAssets.logos.withTextWhitePng
    : clashKingAssets.logos.withTextDarkPng;

  if (!user) {
    return null; // Don't show header if no user
  }

  return (
    <nav className="fixed top-0 inset-x-0 bg-background/95 backdrop-blur-lg z-50 border-b border-primary/30">
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
            />
          </Link>

          {/* Right side: Theme, Language, User */}
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
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