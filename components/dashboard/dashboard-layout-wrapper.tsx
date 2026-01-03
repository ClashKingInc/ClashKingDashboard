"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useParams } from "next/navigation";

export function DashboardLayoutWrapper({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-background shadow-lg animate-in slide-in-from-left duration-200">
            {/* We don't need a close button here because the sidebar itself usually has a header, 
                but the sidebar component might not have a close button. 
                Let's wrap the sidebar content. */}
            <div className="h-full relative">
                {/* Close button positioned absolutely */}
                <div className="absolute right-2 top-2 z-50 md:hidden">
                    {/* We might need to adjust z-index or position depending on sidebar content */}
                </div>
                {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b bg-card text-card-foreground">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="-ml-2">
            <Menu className="h-6 w-6" />
          </Button>
          <span className="ml-2 font-semibold">Dashboard</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
