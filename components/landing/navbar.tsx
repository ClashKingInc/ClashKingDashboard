"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Menu, X, LogOut, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "next-themes";
import { clashKingAssets } from "@/lib/theme";
import type { UserInfo } from "@/lib/api/types/auth";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const params = useParams();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const locale = (params?.locale as string) || "en";
  const t = useTranslations("Navigation");

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

  return (
    <nav className={`fixed top-0 inset-x-0 backdrop-blur-lg z-50 border-b border-primary/30 ${
      mounted && (theme === "dark" || resolvedTheme === "dark")
        ? "bg-card/95"
        : "bg-background/95"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href={`/features`} className="text-foreground hover:text-primary transition-colors font-medium">
              {t("features")}
            </Link>
            <Link href={`/open-source`} className="text-foreground hover:text-primary transition-colors font-medium">
              {t("openSource")}
            </Link>
            <Link href={`/help`} className="text-foreground hover:text-primary transition-colors font-medium">
              {t("help")}
            </Link>
            <Link href={`/support`} className="text-foreground hover:text-primary transition-colors font-medium">
              {t("support")}
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {user ? (
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
                    <Link href={`/${locale}/servers`} className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span className="hover:!text-primary">{t("openDashboard")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 hover:!bg-transparent">
                    <LogOut className="h-4 w-4 text-destructive" />
                    <span className="hover:!text-primary">{t("logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => initiateDiscordLogin(locale)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary"
              >
                {t("loginWithDiscord")}
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-accent"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border">
          <div className="px-4 py-4 space-y-3">
            <Link href={`/features`} className="block py-2 text-foreground hover:text-primary font-medium">
              {t("features")}
            </Link>
            <Link href={`/open-source`} className="block py-2 text-foreground hover:text-primary font-medium">
              {t("openSource")}
            </Link>
            <Link href={`/help`} className="block py-2 text-foreground hover:text-primary font-medium">
              {t("help")}
            </Link>
            <Link href={`/support`} className="block py-2 text-foreground hover:text-primary font-medium">
              {t("support")}
            </Link>
            <div className="pt-4 space-y-2">
              <div className="flex justify-center gap-4 mb-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-accent rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 border border-primary/50">
                        <AvatarImage src={user.avatar_url} alt={user.username} />
                        <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-medium">{user.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </div>
                  <Link href={`/${locale}/servers`} className="block">
                    <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border">
                      {t("openDashboard")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  onClick={() => initiateDiscordLogin(locale)}
                  variant="outline"
                  className="w-full"
                >
                  {t("loginWithDiscord")}
                </Button>
              )}
              <a href="https://invite.clashk.ing/" target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary">
                  {t("addToDiscord")}
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>

  );
}
