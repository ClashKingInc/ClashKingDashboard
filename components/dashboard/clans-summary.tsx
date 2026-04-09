"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { clashKingAssets } from "@/lib/theme";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { apiCache } from "@/lib/api-cache";
import { apiClient } from "@/lib/api/client";

interface ClansSummaryProps {
  guildId: string;
}

interface Clan {
  tag?: string;
  clan_tag?: string;
  name?: string;
  clan_name?: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
}

export function ClansSummary({ guildId }: ClansSummaryProps) {
  const t = useTranslations("OverviewPage");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const clansCacheKey = `overview-clans-${guildId}`;
  const [clans, setClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchClans = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setHasError(false);

    if (forceRefresh) {
      apiCache.invalidate(clansCacheKey);
    }

    try {
      const hasSession = localStorage.getItem("access_token") || localStorage.getItem("refresh_token");
      if (!hasSession) {
        setIsLoading(false);
        return;
      }

      const res = await apiCache.get(clansCacheKey, () => apiClient.servers.getServerClans(guildId));

      if (res.error) throw new Error(res.error);

      setClans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch clans:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [clansCacheKey, guildId]);

  useEffect(() => {
    fetchClans();
  }, [fetchClans]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-32 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">{tCommon("loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => fetchClans(true)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {tCommon("tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (clans.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t("quickStart.title")}</CardTitle>
          <CardDescription>{t("quickStart.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ["quickStart.step1.title", "quickStart.step1.description"],
            ["quickStart.step2.title", "quickStart.step2.description"],
            ["quickStart.step3.title", "quickStart.step3.description"],
          ] as const).map(([titleKey, descKey], idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                {idx + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(descKey)}</p>
              </div>
            </div>
          ))}
          <Button
            className="mt-2"
            onClick={() => router.push(`/${locale}/dashboard/${guildId}/clans`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("clans.addFirst")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-foreground">{t("clans.title")}</CardTitle>
          <CardDescription>{t("clans.description", { count: clans.length })}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${locale}/dashboard/${guildId}/clans`)}
        >
          {t("clans.manage")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {clans.map((clan) => {
            const tag = clan.tag || clan.clan_tag || "";
            const name = clan.name || clan.clan_name || tag;
            const badge = clan.badge_url || clan.clan_badge_url || clashKingAssets.icons.generic.unknownPerson;
            return (
              <div
                key={tag}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <Image
                  src={badge}
                  alt={name}
                  width={28}
                  height={28}
                  className="rounded-sm"
                  unoptimized
                />
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
                  <p className="text-xs text-muted-foreground">{tag}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
