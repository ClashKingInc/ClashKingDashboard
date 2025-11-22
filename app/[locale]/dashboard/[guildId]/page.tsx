"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Activity } from "lucide-react";

export default function OverviewPage() {
  const t = useTranslations("OverviewPage");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("description")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{t("stats.linkedPlayers")}</CardTitle>
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">245</div>
              <p className="text-xs text-muted-foreground">{t("stats.linkedPlayersChange")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{t("stats.activeClans")}</CardTitle>
              <div className="rounded-full bg-primary/10 p-2">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground">{t("stats.allClansConfigured")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{t("stats.botStatus")}</CardTitle>
              <div className="rounded-full bg-green-500/10 p-2">
                <Activity className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-500 hover:bg-green-600">{t("stats.online")}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{t("stats.lastRestart")}</p>
            </CardContent>
          </Card>
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
