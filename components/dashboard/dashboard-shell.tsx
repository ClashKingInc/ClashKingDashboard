"use client";

import { useLocale } from "next-intl";
import { SidebarClient } from "@/components/dashboard/sidebar-client";
import { DashboardLayoutWrapper } from "@/components/dashboard/dashboard-layout-wrapper";
import {
  DashboardAccessProvider,
  DashboardRouteAccess,
} from "@/components/dashboard/dashboard-access-provider";
import { useGuildId } from "@/lib/dashboard-route";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const guildId = useGuildId();

  return (
    <DashboardAccessProvider guildId={guildId}>
      <DashboardLayoutWrapper
        sidebar={<SidebarClient guildId={guildId} locale={locale} />}
        mobileHeader={<SidebarClient guildId={guildId} locale={locale} variant="mobile-header" />}
      >
        <DashboardRouteAccess>{children}</DashboardRouteAccess>
      </DashboardLayoutWrapper>
    </DashboardAccessProvider>
  );
}
