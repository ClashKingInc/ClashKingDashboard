import { getTranslations } from "next-intl/server";
import { ServerStats } from "@/components/dashboard/server-stats";
import { ClansSummary } from "@/components/dashboard/clans-summary";
import { BotStats } from "@/components/dashboard/bot-stats";

interface OverviewPageProps {
  readonly params: Promise<{
    guildId: string;
    locale: string;
  }>;
}

export default async function OverviewPage({ params }: OverviewPageProps) {
  const { guildId } = await params;
  const t = await getTranslations("OverviewPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ServerStats guildId={guildId} />
        </div>

        <ClansSummary guildId={guildId} />

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("botSection")}</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <BotStats />
          </div>
        </div>
      </div>
    </div>
  );
}
