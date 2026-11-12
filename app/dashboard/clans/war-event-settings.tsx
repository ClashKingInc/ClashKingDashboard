"use client";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "use-intl";
import { ClanWarEventsGet, ClanWarEventsPut } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WarEventSettings({serverId,clanTag}:{readonly serverId:string;readonly clanTag:string}) {
 const id=useId();
 const canEdit = useDashboardAccess().canManage("logs");
 const t=useTranslations("ClansPage.warEvents"),common=useTranslations("Common");
 const [enabled,setEnabled]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setLoaded(false);setError("");setSaved(false);
  executeSharedEndpoint(ClanWarEventsGet,{path:{serverId,clanTag},query:{},body:{}},{signal:abort.signal}).then(result=>{
   if(abort.signal.aborted)return;setEnabled(result.enabled);setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(t("loadError"));});
  // Each clan owns its draft. A delayed response must not overwrite a newly selected clan.
  return ()=>abort.abort();
 },[serverId,clanTag,retry,t]);
 const save=async(value:boolean)=>{
  if(!canEdit||!loaded||busy)return;setBusy(true);setError("");setSaved(false);
  try{const result=await executeSharedEndpoint(ClanWarEventsPut,{path:{serverId,clanTag},query:{},body:{enabled:value}});setEnabled(result.enabled);setSaved(true);}
  catch{setError(t("saveError"));}finally{setBusy(false);}
 };
 return <section className="rounded-[20px] bg-card px-4 py-4 shadow-sm shadow-black/5 sm:px-5" aria-labelledby={`${id}-label`} aria-busy={busy}>
  <div className="flex items-center justify-between gap-4">
   <div><label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold">{t("title")}</label><p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p></div>
   <div className="flex items-center gap-2">{busy ? <Loader2 aria-label="Saving" className="h-4 w-4 animate-spin text-muted-foreground" /> : saved ? <Check aria-label={t("saved")} className="h-4 w-4 text-emerald-500" /> : null}<Switch id={id} checked={enabled} disabled={!canEdit||!loaded||busy} onCheckedChange={value=>void save(value)} /></div>
  </div>
  {!loaded&&!error&&<p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>}
  {error&&<div role="alert" className="text-sm text-destructive">{error}{!loaded&&<Button type="button" variant="ghost" onClick={()=>setRetry(value=>value+1)}>{common("retry")}</Button>}</div>}
  <span role="status" className="sr-only">{saved?t("saved"):busy?"Saving":""}</span>
 </section>;
}
