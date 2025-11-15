import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  // TODO: Fetch real server data from API
  const guildName = "My Server";
  const guildIcon = undefined;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar guildId={guildId} guildName={guildName} guildIcon={guildIcon} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
