"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { ClanWarEventsGet, ClanWarEventsPut } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function WarEventSettings({serverId,clanTag}:{readonly serverId:string;readonly clanTag:string}) {
 const t=useTranslations("ClansPage.warEvents"),common=useTranslations("Common");
 const [enabled,setEnabled]=useState(false),[original,setOriginal]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setLoaded(false);setError("");setSaved(false);
  executeSharedEndpoint(ClanWarEventsGet,{path:{serverId,clanTag},query:{},body:{}},{signal:abort.signal}).then(result=>{
   if(abort.signal.aborted)return;setEnabled(result.enabled);setOriginal(result.enabled);setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(t("loadError"));});
  // Each clan owns its draft. A delayed response must not overwrite a newly selected clan.
  return ()=>abort.abort();
 },[serverId,clanTag,retry,t]);
 const save=async()=>{
  if(!loaded||busy)return;setBusy(true);setError("");setSaved(false);
  try{const result=await executeSharedEndpoint(ClanWarEventsPut,{path:{serverId,clanTag},query:{},body:{enabled}});setOriginal(result.enabled);setEnabled(result.enabled);setSaved(true);}
  catch{setError(t("saveError"));}finally{setBusy(false);}
 };
 return <section className="space-y-3 pt-3" aria-labelledby="war-events-label" aria-busy={busy}>
  <div className="flex items-center justify-between gap-4">
   <div><label id="war-events-label" htmlFor="war-events-switch" className="text-sm font-semibold">{t("title")}</label><p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p></div>
   <Switch id="war-events-switch" checked={enabled} disabled={!loaded||busy} onCheckedChange={value=>{setEnabled(value);setSaved(false);}} />
  </div>
  {!loaded&&!error&&<p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>}
  {loaded&&<Button type="button" variant="secondary" disabled={busy||enabled===original} onClick={()=>void save()}>{t("save")}</Button>}
  {error&&<div role="alert" className="text-sm text-destructive">{error}{!loaded&&<Button type="button" variant="ghost" onClick={()=>setRetry(value=>value+1)}>{common("retry")}</Button>}</div>}
  {saved&&<p role="status" className="text-sm text-muted-foreground">{t("saved")}</p>}
 </section>;
}
