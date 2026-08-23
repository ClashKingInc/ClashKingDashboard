"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, LogOut, Menu, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/lib/auth/logout";
import { useAuthSession } from "@/components/auth-session-provider";
import Link from "next/link";
import { dashboardHref } from "@/lib/dashboard-route";
import { getGraphicsEditorMode, GRAPHICS_EDITOR_MODE_EVENT } from "@/lib/graphics-editor-shell";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function DashboardLayoutWrapper({
  sidebar,
  mobileHeader,
  guildId = "",
  children,
}: {
  readonly sidebar: React.ReactNode;
  readonly mobileHeader?: React.ReactNode;
  readonly guildId?: string;
  readonly children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [graphicsEditorActive, setGraphicsEditorActive] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const tCommon = useTranslations("Common");
  const tNavigation = useTranslations("Navigation");
  const { user } = useAuthSession();
  const usesContextualHeader = pathname === "/dashboard/rosters/builder";
  const isGraphicsRoute = pathname.includes("/dashboard/graphics");
  const usesEditorShell = isGraphicsRoute && graphicsEditorActive;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const accountLink = user ? (
      <Link
        href={dashboardHref("settings", guildId)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 p-1 pr-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={tNavigation("accountSettings")}
      >
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={user.avatar_url} alt={user.username} />
          <AvatarFallback className="text-xs">
            {user.username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden="true" />
      </Link>
  ) : null;

  const logoutControl = user ? (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="h-9 w-9 text-muted-foreground hover:bg-accent/60 hover:text-destructive"
        aria-label={tNavigation("logout")}
      >
        <LogOut className="h-4 w-4" />
      </Button>
  ) : null;

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    // App routes render inside a custom scroll container, so reset that container on navigation.
    mainContentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    if (!isGraphicsRoute) {
      setGraphicsEditorActive(false);
      return;
    }
    setGraphicsEditorActive(getGraphicsEditorMode());
    const onEditorMode = (event: Event) => setGraphicsEditorActive(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(GRAPHICS_EDITOR_MODE_EVENT, onEditorMode);
    return () => window.removeEventListener(GRAPHICS_EDITOR_MODE_EVENT, onEditorMode);
  }, [isGraphicsRoute]);

  return (
    <div className="dashboard-app flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!usesEditorShell && <div className="hidden h-full lg:block">{sidebar}</div>}

      {/* Mobile Sidebar Overlay */}
      {!usesEditorShell && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent className="flex flex-col lg:hidden" closeLabel={tCommon("close")} showClose={false}>
            <SheetTitle className="sr-only">{tCommon("dashboard")}</SheetTitle>
            <SheetDescription className="sr-only">{tCommon("openMenu")}</SheetDescription>
            <div data-slot="mobile-sidebar-header" className="flex min-h-16 shrink-0 items-center justify-between border-b border-border px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <span className="min-w-0 truncate px-2 text-sm font-semibold text-foreground">{tCommon("dashboard")}</span>
              <SheetClose asChild>
                <Button variant="ghost" size="touch-icon" className="shrink-0 text-muted-foreground hover:bg-accent/60 hover:text-foreground" aria-label={tCommon("close")}>
                  <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetClose>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        {!usesEditorShell && <div className="flex min-h-16 items-center border-b border-border bg-card/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-card-foreground backdrop-blur lg:hidden">
          <Button variant="ghost" size="touch-icon" onClick={() => setIsSidebarOpen(true)} className="-ml-2" aria-label={tCommon("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-1 min-w-0 flex-1 sm:ml-2">
            {usesContextualHeader ? (
              <div id="dashboard-mobile-header-actions" className="min-w-0" />
            ) : (
              mobileHeader ?? <span className="font-semibold">{tCommon("dashboard")}</span>
            )}
          </div>
          {!usesContextualHeader && (
            <div className="ml-1 shrink-0">{accountLink}</div>
          )}
        </div>}

        {!usesEditorShell && <div className="hidden h-[72px] shrink-0 items-center gap-1.5 border-b border-border bg-card/70 px-6 backdrop-blur lg:flex">
          <div id="dashboard-header-actions" className="min-w-0 flex-1" />
          {!usesContextualHeader && (
            <>
              {accountLink}
              {logoutControl}
            </>
          )}
        </div>}

        <main ref={mainContentRef} className={usesEditorShell ? "min-h-0 flex-1 overflow-hidden" : "dashboard-content @container/dashboard flex-1 overflow-y-auto [scrollbar-gutter:stable]"}>
          {children}
        </main>
      </div>
    </div>
  );
}
