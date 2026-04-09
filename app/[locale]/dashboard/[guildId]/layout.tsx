import { SidebarClient } from "@/components/dashboard/sidebar-client";
import { DashboardLayoutWrapper } from "@/components/dashboard/dashboard-layout-wrapper";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  return (
    <DashboardLayoutWrapper sidebar={<SidebarClient guildId={guildId} />}>
      {children}
    </DashboardLayoutWrapper>
  );
}
