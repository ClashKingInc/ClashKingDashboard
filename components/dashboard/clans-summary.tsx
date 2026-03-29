"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ArrowRight } from "lucide-react";

interface Clan {
  tag?: string;
  clan_tag?: string;
  name?: string;
  clan_name?: string;
  badge_url?: string;
  clan_badge_url?: string;
}

interface ClansSummaryProps {
  guildId: string;
}

export function ClansSummary({ guildId }: ClansSummaryProps) {
  const t = useTranslations("OverviewPage.clans");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [clans, setClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClans = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) { setIsLoading(false); return; }

        const res = await fetch(`/api/v2/server/${guildId}/clans`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClans(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently ignore — non-critical widget
      } finally {
        setIsLoading(false);
      }
    };
    fetchClans();
  }, [guildId]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-foreground">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(`/${locale}/dashboard/${guildId}/clans`)}
        >
          {t("manage")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : clans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noClans")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/dashboard/${guildId}/clans`)}
            >
              {t("addClans")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {clans.map((clan) => {
              const tag = clan.tag || clan.clan_tag || "";
              const name = clan.name || clan.clan_name || tag;
              const badge = clan.badge_url || clan.clan_badge_url || "";
              return (
                <div
                  key={tag}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={badge} alt={name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{tag}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
