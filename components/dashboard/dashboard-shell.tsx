"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthSession } from "@/components/auth-session-provider";
import { SidebarClient } from "@/components/dashboard/sidebar-client";
import { SidebarDataProvider } from "@/components/dashboard/sidebar-wrapper";
import { DashboardQueryProvider } from "@/components/dashboard/dashboard-query-provider";
import { DashboardLayoutWrapper } from "@/components/dashboard/dashboard-layout-wrapper";
import {
  DashboardAccessProvider,
  DashboardRouteAccess,
} from "@/components/dashboard/dashboard-access-provider";
import { DashboardRouteProvider, useGuildId } from "@/lib/dashboard-route";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const guildId = useGuildId();
  const { status: authStatus } = useAuthSession();

  useEffect(() => {
    if (authStatus === "anonymous") router.replace("/login");
  }, [authStatus, router]);

  // Dashboard pages contain client-side data effects. Mount them only after
  // hydration has supplied the URL guild and restored the cookie session, so
  // no page can permanently cache a request made with an empty guild ID.
  if (!guildId || authStatus !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  return (
    <DashboardQueryProvider>
      <DashboardRouteProvider guildId={guildId}>
        <DashboardAccessProvider guildId={guildId}>
          <SidebarDataProvider guildId={guildId}>
            <DashboardLayoutWrapper
              guildId={guildId}
              sidebar={<SidebarClient guildId={guildId} locale={locale} />}
              mobileHeader={<SidebarClient guildId={guildId} locale={locale} variant="mobile-header" />}
            >
              <DashboardRouteAccess>{children}</DashboardRouteAccess>
            </DashboardLayoutWrapper>
          </SidebarDataProvider>
        </DashboardAccessProvider>
      </DashboardRouteProvider>
    </DashboardQueryProvider>
  );
}
