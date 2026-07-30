import { SidebarClient } from "@/components/dashboard/sidebar-client";
import { DashboardLayoutWrapper } from "@/components/dashboard/dashboard-layout-wrapper";
import { DashboardAccessProvider, DashboardRouteAccess } from "@/components/dashboard/dashboard-access-provider";

export default async function DashboardLayout({
  children,
  params,
}: {
  readonly children: React.ReactNode;
  readonly params: Promise<{ locale: string; guildId: string }>;
}) {
  const { locale, guildId } = await params;

  return <DashboardAccessProvider guildId={guildId}>
    <DashboardLayoutWrapper
      sidebar={<SidebarClient guildId={guildId} locale={locale} />}
      mobileHeader={<SidebarClient guildId={guildId} locale={locale} variant="mobile-header" />}
    >
      <DashboardRouteAccess>{children}</DashboardRouteAccess>
    </DashboardLayoutWrapper>
  </DashboardAccessProvider>;
}
