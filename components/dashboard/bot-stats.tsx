"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Users, Shield, Activity} from "lucide-react";
import {apiClient} from "@/lib/api/client";
import {apiCache} from "@/lib/api-cache";
import type {BotInfo} from "@/lib/api/types/server";

export function BotStats() {
    const t = useTranslations("OverviewPage.stats");
    const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const botInfoCacheKey = "overview-bot-info";

    useEffect(() => {
        const fetchBotInfo = async () => {
            try {
                const hasSession = localStorage.getItem("access_token") || localStorage.getItem("refresh_token");
                if (!hasSession) {
                    setIsLoading(false);
                    return;
                }


                const {data, error, status} = await apiCache.get(botInfoCacheKey, () => apiClient.servers.getBotInfo());

                if (error || !data) {
                    if (status !== 403) {
                        console.error("Failed to fetch bot info:", {error, status});
                    }
                    setIsLoading(false);
                    return;
                }

                setBotInfo(data);
            } catch (err) {
                console.error('Failed to fetch bot info:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBotInfo();
    }, []);

    const isOnline = !isLoading && botInfo;
    const statusStyles = isOnline
        ? {
            iconBg: "bg-green-500/10",
            iconColor: "text-green-500",
            badgeBg: "bg-green-500 hover:bg-green-600"
        }
        : {
            iconBg: "bg-red-500/10",
            iconColor: "text-red-500",
            badgeBg: "bg-red-500 hover:bg-red-600"
        };

    return (
        <>
            <Card className="bg-card border-border h-full min-h-[144px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">{t("playersTracked")}</CardTitle>
                    <div className="rounded-full bg-primary/10 p-2">
                        <Users className="h-4 w-4 text-primary"/>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[84px]">
                    <div className="text-2xl font-bold text-foreground">
                        {isLoading ? <Skeleton className="h-8 w-20 animate-pulse" /> : botInfo?.database.players_tracked.toLocaleString() || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("globalPlayers")}</p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border h-full min-h-[144px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">{t("clansTracked")}</CardTitle>
                    <div className="rounded-full bg-primary/10 p-2">
                        <Shield className="h-4 w-4 text-primary"/>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[84px]">
                    <div className="text-2xl font-bold text-foreground">
                        {isLoading ? <Skeleton className="h-8 w-20 animate-pulse" /> : botInfo?.database.clans_tracked.toLocaleString() || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("globalClans")}</p>
                </CardContent>
            </Card>

            <Card className="bg-card border-border h-full min-h-[144px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">{t("botStatus")}</CardTitle>
                    <div className={`rounded-full ${statusStyles.iconBg} p-2`}>
                        <Activity className={`h-4 w-4 ${statusStyles.iconColor}`}/>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[84px]">
                    <div className="flex items-center gap-2">
                        <Badge className={statusStyles.badgeBg}>
                            {isLoading ? "..." : isOnline ? t("online") : t("offline")}
                        </Badge>
                    </div>
                    <div className="mt-2 min-h-[40px] space-y-1">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-3 w-full animate-pulse" />
                                <Skeleton className="h-3 w-3/4 animate-pulse" />
                            </>
                        ) : botInfo?.system ? (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    {t("memoryUsage", {
                                        used: botInfo.system.memory_used_mb.toFixed(0),
                                        percent: botInfo.system.memory_percent.toFixed(1)
                                    })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("cpuUsage", {
                                        percent: botInfo.system.cpu_percent.toFixed(1)
                                    })
                                    }
                                </p>
                            </>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
