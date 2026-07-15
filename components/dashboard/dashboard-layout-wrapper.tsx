"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

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
  const mainContentRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const tCommon = useTranslations("Common");

  useRequireAuth();

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    // App routes render inside a custom scroll container, so reset that container on navigation.
    mainContentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
          className={`fixed inset-y-0 left-0 w-64 bg-background shadow-lg transition-transform duration-200 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="h-full relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              aria-label={tCommon("close")}
              className="absolute right-2 top-2 z-50 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
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
        <div className="md:hidden flex items-center p-4 border-b bg-card text-card-foreground">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} aria-label={tCommon("openMenu")} className="-ml-2">
            <Menu className="h-6 w-6" />
          </Button>
          <div className="ml-2 min-w-0 flex-1">
            {mobileHeader ?? <span className="font-semibold">{tCommon("dashboard")}</span>}
          </div>
        </div>

        <main ref={mainContentRef} className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  );
}
