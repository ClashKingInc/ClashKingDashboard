import { getTranslations } from "next-intl/server";
import { CalendarRange, Clock3, Gift, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function GiveawaysLoadingPage() {
  const t = await getTranslations("GiveawaysPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("description")}</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.totalEntries")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-20" />
                <Users className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.totalEntries")}</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ongoing")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-16" />
                <Clock3 className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ongoing")}</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.upcoming")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-16" />
                <CalendarRange className="h-8 w-8 text-amber-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.upcoming")}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-500/30 bg-slate-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ended")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-16" />
                <Trophy className="h-8 w-8 text-slate-400/60" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ended")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle")}</CardTitle>
            <CardDescription>{t("listDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full grid-cols-3 gap-2 md:w-96">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-10 text-center">
                <Gift className="h-8 w-8 text-muted-foreground/40" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
