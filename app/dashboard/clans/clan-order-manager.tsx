"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2 } from "lucide-react";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderedClan {tag:string;name:string}
/** Explicit positions work with touch and keyboard, without requiring precise
 * dragging across the card grid. Keep failures beside the unsaved order. */
export function ClanOrderManager({serverId,categoryId,clans,onSaved}:{serverId:string;categoryId:string|null;clans:OrderedClan[];onSaved:()=>Promise<void>}) {
  const [items,setItems]=useState(clans),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  const move=(from:number,to:number)=>{
    setItems(current=>{const next=[...current],item=next.splice(from,1)[0];next.splice(to,0,item);return next;});setSaved(false);setError("");
  };
  const save=async()=>{
    if(busy)return;setBusy(true);setError("");setSaved(false);
    try{await executeSharedEndpoint(dashboardEndpoints.reorderServerClans,{path:{serverId},query:{},body:{categoryId,clanTags:items.map(clan=>clan.tag)}});await onSaved();setSaved(true);}
    catch(cause){setError(cause instanceof Error?cause.message:"Could not save the clan order");}
    finally{setBusy(false);}
  };
  return <div className="flex min-h-0 flex-col gap-3">
    <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain">
      {items.map((clan,index)=><div key={clan.tag} className="flex items-center gap-2 rounded-2xl bg-muted/45 p-2">
        <Select value={String(index)} disabled={busy} onValueChange={value=>move(index,Number(value))}><SelectTrigger className="h-11 w-[4.5rem] shrink-0 border-0 bg-background/70" aria-label={`Position for ${clan.name}`}><SelectValue /></SelectTrigger><SelectContent>{items.map((item,position)=><SelectItem key={item.tag} value={String(position)}>{position+1}</SelectItem>)}</SelectContent></Select>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{clan.name}</p><p className="truncate text-xs text-muted-foreground">{clan.tag}</p></div>
        <Button size="icon" variant="ghost" className="h-11 w-9 shrink-0" disabled={busy||index===0} aria-label={`Move ${clan.name} up`} onClick={()=>move(index,index-1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-11 w-9 shrink-0" disabled={busy||index===items.length-1} aria-label={`Move ${clan.name} down`} onClick={()=>move(index,index+1)}><ArrowDown className="h-4 w-4" /></Button>
      </div>)}
    </div>
    <div className="flex min-h-11 shrink-0 items-center justify-between gap-3"><p role={error?"alert":"status"} className={`text-sm ${error?"text-destructive":"text-emerald-600 dark:text-emerald-400"}`}>{error|| (saved?<span className="flex items-center gap-1"><Check className="h-4 w-4" />Saved</span>:"")}</p><Button disabled={busy||saved} onClick={()=>void save()}>{busy&&<Loader2 className="h-4 w-4 animate-spin" />}Save order</Button></div>
  </div>;
}
