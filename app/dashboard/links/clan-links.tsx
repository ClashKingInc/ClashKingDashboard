import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ServerClanLinksEndpoint, CreateClanRosterLinkEndpoint, dashboardEndpoints, type EndpointResponse } from "@clashking/api-contracts";
import { Check, ChevronDown, Loader2, Plus, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "use-intl";
import { FolderIcon } from "@/components/ui/folder-icon";
import Image from "@/components/app-image";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { townHallImageUrl } from "@/lib/theme";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Clan = EndpointResponse<typeof ServerClanLinksEndpoint>["clans"][number];
type Member = Clan["members"][number];
const key=(guildId:string)=>["clan-links",guildId];
export function ClanLinks({guildId,onLinked}:{guildId:string;onLinked:()=>void}) {
  const tCategories=useTranslations("ClansPage.categories");
  const client=useQueryClient(),{canManage}=useDashboardAccess();
  const report=useQuery({queryKey:key(guildId),enabled:Boolean(guildId),queryFn:({signal})=>executeSharedEndpoint(ServerClanLinksEndpoint,{path:{serverId:guildId},query:{},body:{}},{signal})});
  const sections=useMemo(()=>{
    const categories=report.data?.categories ?? [];
    const byCategory=new Map(categories.map(category=>[category.name,[] as Clan[]]));
    const uncategorized:Clan[]=[];
    // Keep the API's name/tag order within each category, just like Clans.
    for(const clan of report.data?.clans ?? []) {
      const group=clan.category?.trim() ? byCategory.get(clan.category.trim()) : undefined;
      (group ?? uncategorized).push(clan);
    }
    const groups=categories.map(category=>({...category,clans:byCategory.get(category.name) ?? []}));
    if(uncategorized.length)groups.push({id:"uncategorized",name:tCategories("uncategorized"),clans:uncategorized});
    return groups;
  },[report.data,tCategories]);
  const [target,setTarget]=useState<{clan:Clan;member:Member}|null>(null);
  const [query,setQuery]=useState(""),[search,setSearch]=useState(""),[userId,setUserId]=useState("");
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
  const pickerRef=useRef<HTMLDivElement>(null),searchRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(query.trim()),250);return()=>clearTimeout(timer);},[query]);
  const users=useQuery({queryKey:["clan-link-members",guildId,search],enabled:Boolean(target),queryFn:({signal})=>executeSharedEndpoint(dashboardEndpoints.serverLinks,{path:{serverId:guildId},query:{limit:25,offset:0,...(search ? {query:search} : {})},body:{}},{signal})});
  const close=()=>{setTarget(null);setQuery("");setSearch("");setUserId("");setError("");};
  const link=async()=>{
    if(!target || !userId || saving)return;
    setSaving(true);setError("");
    try {
      await executeSharedEndpoint(CreateClanRosterLinkEndpoint,{path:{serverId:guildId,clanTag:target.clan.tag,playerTag:target.member.tag},query:{},body:{userId}});
      await client.invalidateQueries({queryKey:key(guildId)});onLinked();close();
    }catch(cause){setError(cause instanceof Error ? cause.message : "Could not link the account");}
    finally{setSaving(false);}
  };
  if(report.isPending)return <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-24 rounded-3xl" />)}</div>;
  if(report.error)return <div role="alert" className="rounded-3xl bg-card p-5 text-destructive">{report.error.message}<Button variant="secondary" className="ml-3" onClick={()=>void report.refetch()}>Retry</Button></div>;
  return <div className="space-y-3">
    {!report.data?.clans.length && <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">No clans are configured for this server.</p>}
    {sections.map(section=><section key={section.id} className="space-y-3 pt-3" aria-label={section.name}>
      <div className="flex items-center gap-2"><FolderIcon size={24} /><h3 className="font-semibold">{section.name}</h3><span className="text-xs text-muted-foreground">{section.clans.length}</span></div>
      {section.clans.map(clan=>{
      const linked=clan.members.filter(member=>member.link || member.hidden).length;
      return <Collapsible key={clan.tag} className="rounded-3xl bg-card shadow-sm shadow-black/5">
        <CollapsibleTrigger className="group flex w-full items-center gap-3 p-4 text-left">
          {clan.badge && <Image src={clan.badge} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 object-contain" />}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2"><span className="truncate font-semibold">{clan.name}</span>{clan.verified && <span role="img" aria-label="Verified clan" title="Verified clan"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /></span>}</span>
            <span className="block text-xs text-muted-foreground">{clan.tag} · Level {clan.level}</span>
            <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{clan.members.length} members</span><span>·</span><span>{linked} linked</span></span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 md:px-5 md:pb-5">
          <div className="space-y-1 rounded-2xl bg-muted/45 p-2">
            {clan.members.map(member=><div key={member.tag} className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-2 sm:px-2">
              {/* Center the Town Hall beside the complete two-line player identity. */}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {member.townHall ? <Image src={townHallImageUrl(member.townHall)} alt={`Town Hall ${member.townHall}`} width={20} height={20} unoptimized className="h-5 w-5 shrink-0 object-contain" /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-muted-foreground" title="Town Hall unavailable">—</span>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={member.name}>{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground" title={member.tag}>{member.tag}</p>
                </div>
              </div>
              {/* Keep each Discord identity/action beside its player on mobile.
                  Both columns may truncate names; neither may wrap below the tag. */}
              <div className="flex min-w-0 max-w-[48%] shrink-0 items-center justify-end gap-1.5">
                {member.hidden && !member.link ? <span className="text-xs italic text-muted-foreground">Hidden</span> : (member.link || !canManage("links")) && <DiscordUserDisplay userId={member.link?.userId} username={member.link?.username} avatarUrl={member.link?.avatar} isOnServer={member.link?.inServer} />}
                {member.hidden && member.link && <Badge variant="secondary" className="shrink-0 border-0 px-1.5 py-0.5 text-[10px]">Hidden</Badge>}
                {/* Verification is useful only beside a current server member; off-server links retain their profile popover. */}
                {member.link?.inServer && <span role="img" aria-label={member.link.verified ? "Verified" : "Unverified"} title={member.link.verified ? "Verified" : "Unverified"} className="shrink-0">
                  {member.link.verified ? <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <TriangleAlert aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
                </span>}
                {!member.link && !member.hidden && canManage("links") && <Button size="sm" variant="secondary" className="h-7 shrink-0 gap-1 border-0 bg-muted/65 px-2 shadow-sm shadow-black/5 hover:bg-muted [&_svg]:size-3.5" aria-label={`Link ${member.name}`} onClick={()=>{setTarget({clan,member});setError("");}}><Plus />Link</Button>}
              </div>
            </div>)}
            {!clan.members.length && <p className="p-3 text-sm text-muted-foreground">No roster members are available yet.</p>}
          </div>
        </CollapsibleContent>
      </Collapsible>;
    })}
    </section>)}
    <Dialog open={Boolean(target)} onOpenChange={open=>{if(!open && !saving)close();}}>
      <DialogContent variant="form" ref={pickerRef} tabIndex={-1}
        className="flex h-[min(36rem,calc(var(--overlay-height,100dvh)-1rem-env(safe-area-inset-top)))] min-h-0 flex-col gap-3 overflow-hidden border-0 bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5"
        onOpenAutoFocus={event=>{
          // Focus the sheet, not search: opening the picker must not summon the mobile keyboard.
          event.preventDefault();pickerRef.current?.focus({preventScroll:true});
        }}>
        <DialogHeader className="shrink-0 space-y-1 pr-10 text-left">
          <DialogTitle className="truncate leading-6">Link {target?.member.name}</DialogTitle>
          <DialogDescription className="truncate text-xs">{target?.member.tag} · {target?.clan.name}</DialogDescription>
        </DialogHeader>
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-muted/55 px-3 shadow-sm shadow-black/5 focus-within:ring-2 focus-within:ring-ring/35">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Label htmlFor="clan-link-member" className="sr-only">Search server members</Label>
          <Input ref={searchRef} id="clan-link-member" type="search" placeholder="Search members" aria-controls="clan-link-results"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done" disabled={saving}
            className="h-full min-w-0 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            value={query} onChange={event=>{setQuery(event.target.value);setUserId("");}}
            onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();pickerRef.current?.focus({preventScroll:true});}}} />
        </div>
        <div id="clan-link-results" role="group" aria-label="Server members" aria-busy={users.isFetching}
          className="scrollbar-custom min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain">
          {users.isFetching && <p role="status" className="px-2 py-3 text-xs text-muted-foreground">Loading members…</p>}
          {users.error && <p role="alert" className="px-2 py-3 text-sm text-destructive">{users.error.message}</p>}
          {users.data?.members.map(member=><Button key={member.user_id} type="button" variant="ghost" disabled={saving || query.trim()!==search}
            className="h-11 w-full justify-start gap-2.5 rounded-xl px-2 text-sm font-normal aria-pressed:bg-primary/10 aria-pressed:hover:bg-primary/15"
            aria-pressed={userId===member.user_id} onClick={event=>{
              setUserId(member.user_id);
              // Dismiss search without submitting so the selected member and confirmation stay visible.
              searchRef.current?.blur();event.currentTarget.focus({preventScroll:true});
            }}>
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={member.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{member.display_name.slice(0,1)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
              <span className="max-w-[60%] truncate font-medium" title={member.display_name}>{member.display_name}</span>
              <span className="min-w-0 truncate text-xs text-muted-foreground" title={`@${member.username}`}>@{member.username}</span>
            </span>
            {userId===member.user_id && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
          </Button>)}
          {!users.isFetching && users.data?.members.length===0 && <p className="px-2 py-3 text-sm text-muted-foreground">No members matched.</p>}
        </div>
        <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-col sm:items-stretch [&>*]:w-full sm:[&>*]:w-full">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-center text-xs text-muted-foreground">Creates an unverified link.</p>
          <Button className="h-11" disabled={!userId || saving} onClick={()=>void link()}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Link account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
