"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Loader2, LogIn, Share2 } from "lucide-react";
import type { DashboardRosterViewShare } from "@clashking/api-contracts";
import { useAuthSession } from "@/components/auth-session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";
import type { GuildInfo } from "@/lib/api/types/server";
import { dashboardHref } from "@/lib/dashboard-route";
import { useRouter, useSearchParams } from "@/lib/navigation";

type SharedView = typeof DashboardRosterViewShare.Type;

export default function SharedRosterViewPage() {
  const router = useRouter();
  const search = useSearchParams();
  const share = search.get("share")?.trim() ?? "";
  const { status } = useAuthSession();
  const currentShare=useRef(share);currentShare.current=share;
  const [view, setView] = useState<SharedView>();
  const [servers, setServers] = useState<GuildInfo[]>([]);
  const [serverId, setServerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<{id:string;serverId:string;serverName:string;name:string}>();

  useEffect(() => {
    if (!share) {setError("This shared view link is incomplete.");setLoading(false);return;}
    if (status !== "authenticated") return;
    let active=true;
    setLoading(true);setError(undefined);setSaved(undefined);setView(undefined);setServers([]);setServerId("");
    void (async () => {
      const [preview, guilds] = await Promise.all([apiClient.rosters.previewSharedView(share),apiClient.servers.getGuilds()]);
      if (!active) return;
      if (!preview.data) throw new Error(preview.error ?? "This shared view is no longer available.");
      setView(preview.data);
      if (!guilds.data) throw new Error(guilds.error ?? "Your servers could not be loaded.");
      // Check current roster permissions, including delegated managers, rather
      // than assuming that every server visible in the chooser permits a save.
      const candidates=guilds.data.filter(guild=>guild.has_bot && !guild.inactive);
      const choices:GuildInfo[]=[];
      let failed=false;
      for(let start=0;start<candidates.length;start+=4){
        const batch=candidates.slice(start,start+4);
        const checked=await Promise.all(batch.map(async guild=>({guild,response:await apiClient.servers.getDashboardCapabilities(guild.id)})));
        for(const {guild,response} of checked){
          if(!response.data){failed=true;continue;}
          if(response.data.full_access||response.data.sections.rosters==="manage")choices.push(guild);
        }
      }
      if(!active)return;
      choices.sort((a,b)=>a.name.localeCompare(b.name));setServers(choices);
      setServerId(current=>choices.some(server=>server.id===current)?current:choices.length===1?choices[0]!.id:"");
      if(failed && !choices.length)throw new Error("We couldn’t check your server permissions. Try again in a moment.");
      setOpen(true);
    })().catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"This shared view could not be loaded.");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[share,status,attempt]);

  const signIn=()=>{
    sessionStorage.setItem("auth_return_to",`/view?share=${encodeURIComponent(share)}`);
    router.push("/login");
  };
  const save=async()=>{
    const server=servers.find(item=>item.id===serverId);
    if(!server||saving)return;
    setSaving(true);setError(undefined);
    try{
      const response=await apiClient.rosters.importSharedView(share,server.id);
      if(currentShare.current!==share)return;
      if(!response.data)throw new Error(response.error??"The view could not be saved. Please try again.");
      setSaved({id:response.data.id,serverId:server.id,serverName:server.name,name:response.data.name});
    }catch(reason){setError(reason instanceof Error?reason.message:"The view could not be saved.");}
    finally{setSaving(false);}
  };
  const openSaved=()=>{
    if(!saved)return;
    const server=servers.find(item=>item.id===saved.serverId);
    sessionStorage.setItem("selected_guild",JSON.stringify({id:saved.serverId,name:saved.serverName,icon:server?.icon??undefined}));
    router.replace(`${dashboardHref("rosters/builder",saved.serverId)}&viewId=${encodeURIComponent(saved.id)}`);
  };

  return <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12 text-foreground">
    <div className="w-full max-w-md space-y-5 text-center">
      <Share2 aria-hidden className="mx-auto h-7 w-7 text-primary"/>
      <h1 className="text-2xl font-semibold">{view?.name??"A roster view, shared with you"}</h1>
      {status==="restoring"||status==="authenticated"&&loading ? <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none"/>Loading shared view…</p>
        : status==="anonymous" ? <><p className="text-sm text-muted-foreground">Sign in with Discord to save this view to one of your servers.</p><Button onClick={signIn} disabled={!share} className="gap-2"><LogIn className="h-4 w-4"/>Continue with Discord</Button></>
        : <Button onClick={()=>setOpen(true)}>{saved?"View saved copy":"Save to your server"}</Button>}
      {!view&&error&&<div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p>{share&&status==="authenticated"&&<Button variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Try again</Button>}</div>}
    </div>

    <Dialog open={status==="authenticated"&&!loading&&!!view&&open} onOpenChange={value=>{if(!saving)setOpen(value);}}>
      <DialogContent aria-busy={saving} variant="form" className="gap-6 border-0 bg-card shadow-xl" onInteractOutside={event=>{if(saving)event.preventDefault();}} onEscapeKeyDown={event=>{if(saving)event.preventDefault();}}>
        <DialogHeader>
          <DialogTitle className="text-xl">{saved?"View saved":"Save this shared view"}</DialogTitle>
          <DialogDescription>{saved?`Your copy is ready in ${saved.serverName}.`:"Choose where to keep your own copy."}</DialogDescription>
        </DialogHeader>
        {saved?<div className="flex items-center gap-3 rounded-2xl bg-muted/55 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Check aria-hidden className="h-5 w-5"/></span><div className="min-w-0"><p className="truncate font-medium">{saved.name}</p><p className="truncate text-sm text-muted-foreground">{saved.serverName}</p></div></div>:<>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold leading-snug">{view?.name}</h2>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9"><AvatarImage src={view?.sharedBy.avatarUrl??undefined} alt=""/><AvatarFallback>{view?.sharedBy.name.slice(0,1)}</AvatarFallback></Avatar>
              <div className="min-w-0 text-sm"><p className="truncate"><span className="text-muted-foreground">{"Shared by "}</span><span className="font-medium">{view?.sharedBy.name}</span></p><p className="truncate text-muted-foreground">From {view?.sourceServer.name}</p></div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination-server">Save to server</Label>
            <Select value={serverId} onValueChange={value=>{setServerId(value);setError(undefined);}} disabled={saving||servers.length===0}>
              <SelectTrigger id="destination-server" className="h-12 rounded-xl border-0 bg-muted/55 shadow-sm"><SelectValue placeholder="Choose a server"/></SelectTrigger>
              <SelectContent>{servers.map(server=><SelectItem key={server.id} value={server.id}><span className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={server.icon??undefined} alt=""/><AvatarFallback className="text-xs">{server.name.slice(0,1)}</AvatarFallback></Avatar><span className="truncate">{server.name}</span></span></SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">{servers.length?"Uses the rosters you select in that server.":"You need roster-management access in an active server with ClashKing."}</p>
          </div>
        </>}
        {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p>{!servers.length&&<Button variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Try again</Button>}</div>}
        <DialogFooter className="gap-2">
          <Button variant="secondary" disabled={saving} onClick={()=>setOpen(false)}>{saved?"Close":"Cancel"}</Button>
          {saved?<Button onClick={openSaved} className="gap-2">Open view<ChevronRight className="h-4 w-4"/></Button>:<Button disabled={!serverId||saving||!!error&&servers.length===0} onClick={()=>void save()} className="gap-2">{saving&&<Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none"/>}{saving?"Saving…":"Save view"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
