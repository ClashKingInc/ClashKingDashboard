import { SidebarWrapper } from "@/components/dashboard/sidebar-wrapper";
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
    <DashboardLayoutWrapper sidebar={<SidebarWrapper guildId={guildId} />}>
      {children}
    </DashboardLayoutWrapper>
  );
}
