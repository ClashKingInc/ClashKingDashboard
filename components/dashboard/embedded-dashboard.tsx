import { useEffect } from 'react';
import { useLocale } from 'use-intl';
import { SidebarClient } from './sidebar-client';
import { SidebarDataProvider } from './sidebar-wrapper';
import { DashboardLayoutWrapper } from './dashboard-layout-wrapper';
import { DashboardRouteAccess } from './dashboard-access-provider';

/** Share the regular mobile drawer and scroll container, not a second tab UI. */
export function EmbeddedDashboard({ guildId, children }: { guildId: string; children: React.ReactNode }) {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.dataset.embeddedDashboard = 'true';
    return () => { delete document.documentElement.dataset.embeddedDashboard; };
  }, []);
  return (
    <SidebarDataProvider guildId={guildId}>
      <DashboardLayoutWrapper
        embedded
        guildId={guildId}
        sidebar={<SidebarClient guildId={guildId} locale={locale}/>}
        mobileHeader={<SidebarClient guildId={guildId} locale={locale} variant="mobile-header"/>}
      >
        <DashboardRouteAccess>{children}</DashboardRouteAccess>
      </DashboardLayoutWrapper>
    </SidebarDataProvider>
  );
}
