import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotStats } from "@/components/dashboard/bot-stats";
import { Activity } from "lucide-react";

interface BotStatsPageProps {
  params: {
    guildId: string;
    locale: string;
  };
}

export default async function BotStatsPage({ params }: BotStatsPageProps) {
  const t = await getTranslations("BotStatsPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 w-fit">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
        </div>

        {/* Bot Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <BotStats />
        </div>

        {/* Additional Info Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("about.title")}</CardTitle>
            <CardDescription>
              {t("about.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t("about.globalStats")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("about.globalStatsDesc")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t("about.systemHealth")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("about.systemHealthDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
