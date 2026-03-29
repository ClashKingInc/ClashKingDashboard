import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerStats } from "@/components/dashboard/server-stats";

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
          <p className="text-muted-foreground mt-1">
            {t("description")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <ServerStats guildId={guildId} />
        </div>

        {/* Quick Start Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t("quickStart.title")}</CardTitle>
            <CardDescription>
              {t("quickStart.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("quickStart.step1.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("quickStart.step1.description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("quickStart.step2.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("quickStart.step2.description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("quickStart.step3.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("quickStart.step3.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
