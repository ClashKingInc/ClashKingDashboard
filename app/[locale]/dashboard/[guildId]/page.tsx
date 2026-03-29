import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerStats } from "@/components/dashboard/server-stats";
import { BotStats } from "@/components/dashboard/bot-stats";
import { ClansSummary } from "@/components/dashboard/clans-summary";

interface OverviewPageProps {
  params: Promise<{
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

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {/* Server stats — 4 cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ServerStats guildId={guildId} />
        </div>

        {/* Configured clans */}
        <ClansSummary guildId={guildId} />

        {/* Bot stats */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("botSection")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <BotStats />
          </div>
        </div>

        {/* Quick Start */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("quickStart.title")}</CardTitle>
            <CardDescription>{t("quickStart.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t(`quickStart.step${step}.title` as any)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`quickStart.step${step}.description` as any)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
