"use client";

import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";

export default function LeaderboardsPage() {
  const t = useTranslations("LeaderboardsPage");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('comingSoon')}</p>
      </div>
    </div>
  );
}
