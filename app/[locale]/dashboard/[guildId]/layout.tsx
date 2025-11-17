import { Sidebar } from "@/components/dashboard/sidebar";
import { cookies } from "next/headers";

async function getServerInfo(guildId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return { name: "My Server", icon: undefined };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v2/server/${guildId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return { name: "My Server", icon: undefined };
    }

    const data = await response.json();

    // Discord CDN URL for guild icons
    const iconUrl = data.icon
      ? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png?size=128`
      : undefined;

    return {
      name: data.name || "My Server",
      icon: iconUrl,
    };
  } catch (error) {
    console.error("Failed to fetch server info:", error);
    return { name: "My Server", icon: undefined };
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  // Fetch real server data from API
  const serverInfo = await getServerInfo(guildId);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar guildId={guildId} guildName={serverInfo.name} guildIcon={serverInfo.icon} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
