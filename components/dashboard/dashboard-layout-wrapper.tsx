"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function DashboardLayoutWrapper({
  sidebar,
  children,
}: {
  readonly sidebar: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tCommon = useTranslations("Common");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push(`/${locale}/login`);
    }
  }, [router, locale]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Keep the current mobile header height in a CSS variable so pages can offset reliably.
  useEffect(() => {
    const headerEl = mobileHeaderRef.current;
    if (!headerEl) return;

    const root = document.documentElement;
    const updateHeaderHeight = () => {
      root.style.setProperty("--dashboard-mobile-header-height", `${headerEl.getBoundingClientRect().height}px`);
    };

    updateHeaderHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerEl);
    }

    window.addEventListener("resize", updateHeaderHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, [pathname, tCommon]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-default"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-background shadow-lg animate-in slide-in-from-left duration-200">
            <div className="h-full relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="absolute right-2 top-2 z-50 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div ref={mobileHeaderRef} className="md:hidden flex items-center p-4 border-b bg-card text-card-foreground">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="-ml-2">
            <Menu className="h-6 w-6" />
          </Button>
          <span className="ml-2 font-semibold">{tCommon("dashboard")}</span>
        </div>

        <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
    </div>
  );
}
