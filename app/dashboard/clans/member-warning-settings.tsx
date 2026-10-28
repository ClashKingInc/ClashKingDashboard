"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { ClanMemberWarningGet, ClanMemberWarningPut, ClanMemberWarningDelete, ServerChannelsEndpoint } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { RoleCombobox } from "@/components/ui/role-combobox";

export function MemberWarningSettings({serverId,clanTag,roles}:{readonly serverId:string;readonly clanTag:string;readonly roles:Array<{id:string;name:string;color?:number}>}) {
 const t=useTranslations("ClansPage.memberWarning"),common=useTranslations("Common");
 const [retry,setRetry]=useState(0),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[exists,setExists]=useState(false);
 const [error,setError]=useState(""),[saved,setSaved]=useState(false);
 const [channel,setChannel]=useState(""),[role,setRole]=useState("disabled"),[below,setBelow]=useState(""),[above,setAbove]=useState("");
 const [channels,setChannels]=useState<Array<{id:string;name:string;parent_name?:string}>>([]);
 const path={serverId,clanTag};
 useEffect(()=>{
  const abort=new AbortController();setLoaded(false);setError("");
  Promise.all([
   executeSharedEndpoint(ClanMemberWarningGet,{path:{serverId,clanTag},query:{},body:{}},{signal:abort.signal}),
   executeSharedEndpoint(ServerChannelsEndpoint,{path:{serverId},query:{},body:{}},{signal:abort.signal}),
  ]).then(([result,options])=>{
   if(abort.signal.aborted)return;
   const value=result.settings;setChannel(value?.channelId??"");setRole(value?.roleId??"disabled");setBelow(value?.below?.toString()??"");setAbove(value?.above?.toString()??"");setExists(value!==null);
   setChannels(options.filter(item=>item.type==="text"||item.type==="news"));setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(t("loadError"));});
  // The selected clan owns this draft. Cancel older loads on close or clan changes.
  return ()=>abort.abort();
 },[serverId,clanTag,retry,t]);
 const save=async(disable=false)=>{
  if(!loaded||busy)return;
  const low=below.trim()===""?null:Number(below),high=above.trim()===""?null:Number(above);
  if(!disable&&(!channel||channel==="disabled"||(low===null&&high===null)||(low!==null&&(!Number.isInteger(low)||low<1||low>50))||(high!==null&&(!Number.isInteger(high)||high<0||high>49))||(low!==null&&high!==null&&low>high))){setError(t("invalid"));return;}
  setBusy(true);setError("");setSaved(false);
  try{
   if(disable){await executeSharedEndpoint(ClanMemberWarningDelete,{path,query:{},body:{}});setExists(false);setChannel("");setBelow("");setAbove("");setRole("disabled");}
   else{await executeSharedEndpoint(ClanMemberWarningPut,{path,query:{},body:{channelId:channel,below:low,above:high,roleId:role==="disabled"?null:role}});setExists(true);}
   setSaved(true);
  }catch{setError(t("saveError"));}finally{setBusy(false);}
 };
 const edit=()=>setSaved(false);
 return <section className="space-y-3 pt-3" aria-busy={busy} aria-labelledby="member-warning-heading">
  <div><h3 id="member-warning-heading" className="text-sm font-semibold">{t("title")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p></div>
  {!loaded&&!error&&<p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>}
  {loaded&&<><div className="grid gap-3 sm:grid-cols-2">
   <div className="space-y-1.5"><Label>{t("channel")}</Label><ChannelCombobox channels={channels} value={channel} onValueChange={value=>{setChannel(value);edit();}} disabled={busy} showDisabled={false} placeholder={t("channel")} className="border-0 bg-muted/55 shadow-sm shadow-black/5" /></div>
   <div className="space-y-1.5"><Label htmlFor="member-warning-role">{t("role")}</Label><RoleCombobox id="member-warning-role" roles={roles} excludeRoleIds={[serverId]} value={role} onValueChange={value=>{setRole(value);edit();}} disabled={busy} className="border-0 bg-muted/55 shadow-sm shadow-black/5" /></div>
   <div className="space-y-1.5"><Label htmlFor="member-warning-below">{t("below")}</Label><Input id="member-warning-below" type="number" min={1} max={50} value={below} disabled={busy} onChange={event=>{setBelow(event.target.value);edit();}} /></div>
   <div className="space-y-1.5"><Label htmlFor="member-warning-above">{t("above")}</Label><Input id="member-warning-above" type="number" min={0} max={49} value={above} disabled={busy} onChange={event=>{setAbove(event.target.value);edit();}} /></div>
  </div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>void save()}>{t("save")}</Button>{exists&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>void save(true)}>{t("disable")}</Button>}</div></>}
  {error&&<div role="alert" className="text-sm text-destructive">{error}{!loaded&&<Button type="button" variant="ghost" onClick={()=>setRetry(value=>value+1)}>{common("retry")}</Button>}</div>}
  {saved&&<p role="status" className="text-sm text-muted-foreground">{t("saved")}</p>}
 </section>;
}
