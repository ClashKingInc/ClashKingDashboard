import { redirect } from "next/navigation";

export default async function TicketsSettingsRedirect({
  params,
}: {
  params: Promise<{ locale: string; guildId: string }>;
}) {
  const { locale, guildId } = await params;
  redirect(`/${locale}/dashboard/${guildId}/tickets`);
}
