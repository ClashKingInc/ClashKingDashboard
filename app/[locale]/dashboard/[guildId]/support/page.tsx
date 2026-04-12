import { redirect } from "next/navigation";

interface DashboardSupportRedirectPageProps {
  readonly params: Promise<{ locale: string; guildId: string }>;
}

export default async function DashboardSupportRedirectPage({ params }: DashboardSupportRedirectPageProps) {
  const { locale, guildId } = await params;
  redirect(`/${locale}/dashboard/${guildId}/support-us`);
}
