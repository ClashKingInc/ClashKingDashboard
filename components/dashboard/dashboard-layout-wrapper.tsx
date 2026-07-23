"use client";

import { useState, useEffect, useRef } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SettingsDropdown } from "@/components/settings-dropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserInfo } from "@/lib/api/types/auth";
import { logout } from "@/lib/auth/logout";

export function DashboardLayoutWrapper({
  sidebar,
  mobileHeader,
  children,
}: {
  readonly sidebar: React.ReactNode;
  readonly mobileHeader?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tCommon = useTranslations("Common");
  const tNavigation = useTranslations("Navigation");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push(`/${locale}/login`);
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
    }
  }, [router, locale]);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push(`/${locale}`);
  };

  const accountControls = user ? (
    <>
      <Avatar className="h-8 w-8 border border-border">
        <AvatarImage src={user.avatar_url} alt={user.username} />
        <AvatarFallback className="text-xs">
          {user.username.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="h-9 w-9 text-muted-foreground hover:bg-accent/60 hover:text-destructive"
        aria-label={tNavigation("logout")}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  ) : null;

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    // App routes render inside a custom scroll container, so reset that container on navigation.
    mainContentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="dashboard-app flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!isSidebarOpen}
        inert={!isSidebarOpen}
      >
        <button
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
          tabIndex={isSidebarOpen ? 0 : -1}
        />
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-2xl transition-transform duration-200 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="h-full relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-3 top-3 z-50 h-8 w-8 rounded-lg"
              aria-label={tCommon("close")}
              tabIndex={isSidebarOpen ? 0 : -1}
            >
              <X className="h-4 w-4" />
            </Button>
            {sidebar}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="flex h-16 items-center border-b border-border bg-card/95 px-4 text-card-foreground backdrop-blur md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="-ml-2 h-10 w-10" aria-label={tCommon("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-2 min-w-0 flex-1">
            {mobileHeader ?? <span className="font-semibold">{tCommon("dashboard")}</span>}
          </div>
          <SettingsDropdown
            locale={locale}
            triggerButtonClassName="h-10 w-10 rounded-xl"
            menuClassName="w-52"
            subTriggerClassName="flex items-center gap-2 rounded-lg py-2"
            itemClassName="flex items-center gap-2 rounded-lg py-2"
          />
          {accountControls}
        </div>

        <div className="hidden h-[72px] shrink-0 items-center justify-end gap-1.5 border-b border-border bg-card/70 px-6 backdrop-blur md:flex">
          <SettingsDropdown
            locale={locale}
            triggerButtonClassName="h-9 w-9 border-0 bg-transparent shadow-none hover:bg-accent/60"
            menuClassName="w-52"
            subTriggerClassName="flex items-center gap-2 rounded-lg py-2"
            itemClassName="flex items-center gap-2 rounded-lg py-2"
          />
          {accountControls}
        </div>

        <main ref={mainContentRef} className="dashboard-content flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  );
}
