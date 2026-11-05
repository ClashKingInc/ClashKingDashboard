import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ServerClanLinksEndpoint, CreateClanRosterLinkEndpoint, dashboardEndpoints, type EndpointResponse } from "@clashking/api-contracts";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import Image from "@/components/app-image";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { townHallImageUrl } from "@/lib/theme";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Clan = EndpointResponse<typeof ServerClanLinksEndpoint>["clans"][number];
type Member = Clan["members"][number];
const key=(guildId:string)=>["clan-links",guildId];
export function ClanLinks({guildId,onLinked}:{guildId:string;onLinked:()=>void}) {
  const client=useQueryClient(),{canManage}=useDashboardAccess();
  const report=useQuery({queryKey:key(guildId),enabled:Boolean(guildId),queryFn:({signal})=>executeSharedEndpoint(ServerClanLinksEndpoint,{path:{serverId:guildId},query:{},body:{}},{signal})});
  const [target,setTarget]=useState<{clan:Clan;member:Member}|null>(null);
  const [query,setQuery]=useState(""),[search,setSearch]=useState(""),[userId,setUserId]=useState("");
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
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
    <p className="text-sm text-muted-foreground">Expand a clan to review its roster and Discord links. Rosters use the latest stored clan snapshot.</p>
    {!report.data?.clans.length && <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">No clans are configured for this server.</p>}
    {report.data?.clans.map(clan=>{
      const linked=clan.members.filter(member=>member.link || member.hidden).length;
      return <Collapsible key={clan.tag} className="rounded-3xl bg-card shadow-sm shadow-black/5">
        <CollapsibleTrigger className="group flex w-full items-center gap-3 p-4 text-left md:p-5">
          {clan.badge && <Image src={clan.badge} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 object-contain" />}
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{clan.name}</span><span className="text-xs text-muted-foreground">{clan.tag} · Level {clan.level}</span></span>
          <span className="flex flex-wrap justify-end gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{clan.members.length} members</Badge><Badge variant="secondary">{linked} linked</Badge>{clan.verified && <Badge variant="secondary">Verified clan</Badge>}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 md:px-5 md:pb-5">
          {clan.observedAt && <p className="mb-3 text-xs text-muted-foreground">Roster updated <time dateTime={clan.observedAt}>{new Date(clan.observedAt).toLocaleString()}</time></p>}
          <div className="space-y-2 rounded-2xl bg-muted/45 p-2">
            {clan.members.map(member=><div key={member.tag} className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-2">
              {member.townHall ? <Image src={townHallImageUrl(member.townHall)} alt={`Town Hall ${member.townHall}`} width={36} height={36} unoptimized className="h-9 w-9 object-contain" /> : <span className="flex h-9 w-9 items-center justify-center text-xs text-muted-foreground" title="Town Hall unavailable">—</span>}
              <div className="min-w-0 flex-1"><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.tag}</p></div>
              <div className="flex flex-wrap items-center gap-3">
                {member.hidden && !member.link ? <span className="text-sm italic text-muted-foreground">Hidden</span> : <DiscordUserDisplay userId={member.link?.userId} username={member.link?.username} avatarUrl={member.link?.avatar} isOnServer={member.link?.inServer} />}
                {member.hidden && member.link && <Badge variant="secondary">Hidden</Badge>}
                {member.link ? <Badge variant="secondary" className={member.link.verified ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>{member.link.verified ? "Verified" : "Unverified"}</Badge>
                  : !member.hidden && canManage("links") && <Button size="sm" variant="secondary" aria-label={`Link ${member.name}`} onClick={()=>{setTarget({clan,member});setError("");}}><Plus className="mr-1 h-4 w-4" />Link</Button>}
              </div>
            </div>)}
            {!clan.members.length && <p className="p-3 text-sm text-muted-foreground">No roster members are available yet.</p>}
          </div>
        </CollapsibleContent>
      </Collapsible>;
    })}
    <Dialog open={Boolean(target)} onOpenChange={open=>{if(!open && !saving)close();}}>
      <DialogContent variant="form"><DialogHeader><DialogTitle>Link {target?.member.name}</DialogTitle><DialogDescription>{target?.member.tag} · {target?.clan.name}. This creates an unverified link without an in-game API token.</DialogDescription></DialogHeader>
        <div className="space-y-3"><Label htmlFor="clan-link-member">Discord server member</Label><Input id="clan-link-member" placeholder="Search members or paste a Discord ID" value={query} onChange={event=>{setQuery(event.target.value);setUserId("");}} />
          <div className="max-h-64 space-y-1 overflow-y-auto">{users.isFetching && <p role="status" className="text-sm text-muted-foreground">Loading members…</p>}
            {users.error && <p role="alert" className="text-sm text-destructive">{users.error.message}</p>}
            {users.data?.members.map(member=><Button key={member.user_id} type="button" variant="secondary" className="h-auto w-full justify-start gap-3 p-3" aria-pressed={userId===member.user_id} onClick={()=>setUserId(member.user_id)}>
              {member.avatar_url && <Image src={member.avatar_url} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-full" />}<span className="min-w-0 text-left"><span className="block truncate">{member.display_name}</span><span className="block text-xs text-muted-foreground">@{member.username} · {member.user_id}</span></span>{userId===member.user_id && <Badge className="ml-auto">Selected</Badge>}
            </Button>)}
            {!users.isFetching && users.data?.members.length===0 && <p className="text-sm text-muted-foreground">No members matched.</p>}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button variant="secondary" disabled={saving} onClick={close}>Cancel</Button><Button disabled={!userId || saving} onClick={()=>void link()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add unverified link</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
