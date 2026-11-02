"use client";
import { useEffect,useState } from "react";
import { useTranslations } from "use-intl";
import { ServerLimitsEndpoint, type EndpointResponse } from "@clashking/api-contracts";
import { apiClient } from "@/lib/api/client";
import { SUPPORT_DISCORD_URL } from "@/lib/support";
export function ResourceLimits({serverId}:{serverId:string}){
 const t=useTranslations("ManualLimits"),[value,setValue]=useState<EndpointResponse<typeof ServerLimitsEndpoint>>(),[error,setError]=useState<string>();
 useEffect(()=>{let active=true;apiClient.servers.getResourceLimits(serverId).then(result=>{if(active){setValue(result.data);setError(result.error)}});return()=>{active=false}},[serverId]);
 return <section className="space-y-4"><h2 className="text-lg font-semibold">{t("title")}</h2>{error?<p role="alert">{error}</p>:value?<dl className="grid gap-4 sm:grid-cols-3"><div><dt>{t("clans")}</dt><dd>{value.clanCount} / {value.clanLimit}</dd></div><div><dt>{t("autoboards")}</dt><dd>{value.autoboardCount} / {value.autoboardLimit}</dd></div><div><dt>{t("ai")}</dt><dd>${value.aiSpentUsd.toFixed(4)} / ${value.aiMonthlyLimitUsd.toFixed(2)}</dd><dd className="text-xs text-muted-foreground">{t("reserved",{amount:value.aiReservedUsd.toFixed(4)})}</dd></div></dl>:<p>…</p>}
 <p className="text-sm text-muted-foreground">{t("raise")} <a className="font-medium text-primary underline" href={SUPPORT_DISCORD_URL} target="_blank" rel="noopener noreferrer">{t("discord")}</a></p></section>
}
