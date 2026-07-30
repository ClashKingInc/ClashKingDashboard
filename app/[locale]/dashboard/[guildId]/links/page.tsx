"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Link,
  List as ListIcon,
  Loader2,
  Plus,
  Search,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { townHallImageUrl } from "@/lib/theme";

interface LinkedAccount {
  player_tag: string;
  player_name: string | null;
  town_hall: number | null;
  is_verified: boolean;
  added_at: string | null;
}

interface MemberLinks {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  linked_accounts: LinkedAccount[];
  account_count: number;
}

interface LinkRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface ServerLinksResponse {
  members: MemberLinks[];
  roles: LinkRole[];
  total_members: number;
  filtered_members: number;
  members_with_links: number;
  total_linked_accounts: number;
  verified_accounts: number;
}

type AccountFilter = "all" | "none";

const ITEMS_PER_PAGE = 100;

function roleColor(role: LinkRole): string {
  return role.color === 0 ? "#b5bac1" : `#${role.color.toString(16).padStart(6, "0")}`;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export default function LinksManagementPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [data, setData] = useState<ServerLinksResponse | null>(null);
  const [statsData, setStatsData] = useState<ServerLinksResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const debouncedQueryText = useDebouncedValue(queryText, 250);
  const [selectedRoles, setSelectedRoles] = useState<LinkRole[]>([]);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [page, setPage] = useState(1);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<MemberLinks | null>(null);
  const [addTag, setAddTag] = useState("");
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const serverQuery = useMemo(() => {
    const mentions = selectedRoles.map(role => `<@&${role.id}>`).join(" ");
    return [mentions, debouncedQueryText.trim()].filter(Boolean).join(" ");
  }, [debouncedQueryText, selectedRoles]);

  const fetchLinks = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String((page - 1) * ITEMS_PER_PAGE),
      });
      if (serverQuery) search.set("query", serverQuery);
      if (accountFilter !== "all") search.set("account_filter", accountFilter);
      const response = await fetch(`/api/v2/links/server/${guildId}?${search}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || body.error || "Failed to fetch links");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to fetch links");
    } finally {
      setLoading(false);
    }
  }, [accountFilter, guildId, page, serverQuery]);

  const fetchStats = useCallback(async () => {
    if (!guildId || statsData) return;
    setStatsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v2/links/server/${guildId}?limit=5000&offset=0`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || body.error || "Failed to fetch link statistics");
      setStatsData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to fetch link statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [guildId, statsData]);

  useEffect(() => {
    setPage(1);
  }, [accountFilter, serverQuery]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const mentionFragment = queryText.trimStart().startsWith("@") ? queryText.trimStart().slice(1).toLowerCase() : null;
  const roleSuggestions = useMemo(() => {
    if (mentionFragment === null) return [];
    const selected = new Set(selectedRoles.map(role => role.id));
    return (data?.roles || [])
      .filter(role => !selected.has(role.id) && role.name.toLowerCase().includes(mentionFragment))
      .slice(0, 8);
  }, [data?.roles, mentionFragment, selectedRoles]);

  const updateAccount = useCallback((playerTag: string, updater: (account: LinkedAccount) => LinkedAccount) => {
    setData(current => current ? {
      ...current,
      members: current.members.map(member => ({
        ...member,
        linked_accounts: member.linked_accounts.map(account => account.player_tag === playerTag ? updater(account) : account),
      })),
    } : current);
  }, []);

  const request = useCallback(async (method: "POST" | "DELETE", options: { query?: URLSearchParams; body?: unknown }) => {
    const suffix = options.query ? `?${options.query}` : "";
    const response = await fetch(`/api/v2/links/server/${guildId}${suffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || body.error || "Link operation failed");
    return body;
  }, [guildId]);

  const addLink = async () => {
    if (!addTarget || !addTag.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await request("POST", { body: { playerTag: addTag.trim(), userID: addTarget.user_id } });
      setAddTarget(null);
      setAddTag("");
      await fetchLinks();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add link");
    } finally {
      setAdding(false);
    }
  };

  const exportLinks = async (format: "csv" | "json") => {
    setExporting(format);
    setError(null);
    try {
      const search = new URLSearchParams({ limit: "5000", offset: "0" });
      if (serverQuery) search.set("query", serverQuery);
      if (accountFilter !== "all") search.set("account_filter", accountFilter);
      const response = await fetch(`/api/v2/links/server/${guildId}?${search}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        cache: "no-store",
      });
      const exportData = await response.json() as ServerLinksResponse & { message?: string; error?: string };
      if (!response.ok) throw new Error(exportData.message || exportData.error || "Failed to export links");

      let contents: string;
      let contentType: string;
      if (format === "json") {
        contents = JSON.stringify(exportData, null, 2);
        contentType = "application/json";
      } else {
        const rows = exportData.members.flatMap(member => member.linked_accounts.map(account => [
          member.user_id,
          member.username,
          member.display_name,
          account.player_tag,
          account.player_name,
          account.town_hall,
          account.is_verified,
          account.added_at,
        ]));
        contents = [
          ["user_id", "username", "display_name", "player_tag", "player_name", "town_hall", "is_verified", "added_at"],
          ...rows,
        ].map(row => row.map(csvCell).join(",")).join("\n");
        contentType = "text/csv";
      }

      const url = URL.createObjectURL(new Blob([contents], { type: contentType }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `server-${guildId}-links.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to export links");
    } finally {
      setExporting(null);
    }
  };

  const loadPlayer = async (account: LinkedAccount) => {
    setPendingAccount(account.player_tag);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v2/player/${encodeURIComponent(account.player_tag)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
      });
      const player = await response.json();
      if (response.status === 404 && player.reason === "notFound") {
        await request("DELETE", { query: new URLSearchParams({ playerTag: account.player_tag }) });
        setNotice(`${account.player_tag} returned 404 and its stale unverified link was removed.`);
        await fetchLinks();
        return;
      }
      if (!response.ok) throw new Error(player.message || player.error || "Failed to load player");
      const townHall = player.town_hall_level ?? player.townHallLevel ?? player.townhall ?? null;
      updateAccount(account.player_tag, current => ({ ...current, player_name: player.name ?? null, town_hall: townHall }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load player");
    } finally {
      setPendingAccount(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.filtered_members || 0) / ITEMS_PER_PAGE));
  const verifiedPercent = data?.total_linked_accounts ? Math.round((data.verified_accounts / data.total_linked_accounts) * 100) : 0;
  const linkedPercent = data?.total_members ? Math.round((data.members_with_links / data.total_members) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3"><Link className="h-8 w-8 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Links Management</h1>
            <p className="mt-1 text-muted-foreground">Manage Discord member account links and review player data.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Members" value={data?.total_members} detail="Cached from Discord for 15 minutes" icon={<User className="h-7 w-7 text-blue-500/50" />} tone="blue" loading={loading} />
          <StatCard title="Members with Links" value={data?.members_with_links} detail={`${linkedPercent}% of members`} icon={<CheckCircle className="h-7 w-7 text-green-500/50" />} tone="green" loading={loading} />
          <StatCard title="Linked Accounts" value={data?.total_linked_accounts} detail="Across current Discord members" icon={<Link className="h-7 w-7 text-purple-500/50" />} tone="purple" loading={loading} />
          <StatCard title="Verified Accounts" value={data?.verified_accounts} detail={`${verifiedPercent}% verified`} icon={<Shield className="h-7 w-7 text-yellow-500/50" />} tone="yellow" loading={loading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Links</CardTitle>
            <CardDescription>Search members, exact player tags, or Discord roles. Click a tag to refresh missing player data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="accounts" onValueChange={value => { if (value === "stats") void fetchStats(); }}>
              <TabsList className="grid h-10 w-full grid-cols-2">
                <TabsTrigger value="accounts" className="gap-2"><ListIcon className="h-4 w-4 text-blue-500" />Accounts</TabsTrigger>
                <TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4 text-green-500" />Stats</TabsTrigger>
              </TabsList>
              <TabsContent value="accounts" className="mt-5 space-y-5">
            {(error || notice) && (
              <div className={`rounded-md border px-3 py-2 text-sm ${error ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
                {error || notice}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="relative min-w-0">
                <div className="flex min-h-10 items-center gap-1.5 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {selectedRoles.map(role => (
                    <span key={role.id} className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium" style={{ color: roleColor(role), backgroundColor: `${roleColor(role)}1f` }}>
                      @{role.name}
                      <button type="button" aria-label={`Remove ${role.name} role filter`} onClick={() => setSelectedRoles(current => current.filter(item => item.id !== role.id))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input
                    value={queryText}
                    onChange={event => setQueryText(event.target.value)}
                    placeholder={selectedRoles.length ? "Add text or another @role" : "Member name, username, player tag, or @role"}
                    className="h-9 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    aria-label="Search linked accounts"
                  />
                </div>
                {mentionFragment !== null && (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-[#3f4147] bg-[#232428] p-1 shadow-xl">
                    {roleSuggestions.length ? roleSuggestions.map(role => (
                      <button
                        type="button"
                        key={role.id}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => { setSelectedRoles(current => [...current, role]); setQueryText(""); }}
                        className="flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-[#35373c]"
                        style={{ color: roleColor(role) }}
                      >
                        @{role.name}
                      </button>
                    )) : <p className="px-3 py-2 text-sm text-[#949ba4]">No available roles</p>}
                  </div>
                )}
              </div>
              <div className="w-full lg:w-48">
                <Select value={accountFilter} onValueChange={value => setAccountFilter(value as AccountFilter)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    <SelectItem value="none">No linked accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{loading ? "Loading members…" : `${data?.filtered_members || 0} matching members`}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void exportLinks("csv")} disabled={Boolean(exporting)}>
                  {exporting === "csv" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => void exportLinks("json")} disabled={Boolean(exporting)}>
                  {exporting === "json" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export JSON
                </Button>
              </div>
            </div>

            {loading ? <MemberSkeleton /> : data?.members.length ? (
              <div className="space-y-3">
                {data.members.map(member => (
                  <MemberCard
                    key={member.user_id}
                    member={member}
                    expanded={expandedMembers.has(member.user_id)}
                    pendingAccount={pendingAccount}
                    onToggle={() => setExpandedMembers(current => {
                      const next = new Set(current);
                      if (next.has(member.user_id)) next.delete(member.user_id); else next.add(member.user_id);
                      return next;
                    })}
                    onAdd={() => { setAddTarget(member); setAddTag(""); }}
                    onLoad={loadPlayer}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p className="font-medium">No members matched</p>
                <p className="text-sm">Try a different member, tag, role, or verification filter.</p>
              </div>
            )}

            {!loading && (data?.filtered_members || 0) > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
              </TabsContent>
              <TabsContent value="stats" className="mt-5">
                {(error && !statsData) ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                ) : (
                  <LinksStats data={statsData} loading={statsLoading} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(addTarget)} onOpenChange={open => { if (!open) setAddTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add account link</DialogTitle>
            <DialogDescription>Link an account to {addTarget?.display_name}.</DialogDescription>
          </DialogHeader>
          <Input value={addTag} onChange={event => setAddTag(event.target.value)} placeholder="#PLAYER_TAG" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTarget(null)}>Cancel</Button>
            <Button onClick={addLink} disabled={adding || !addTag.trim()}>{adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function StatCard({ title, value, detail, icon, tone, loading }: Readonly<{ title: string; value?: number; detail: string; icon: React.ReactNode; tone: "blue" | "green" | "purple" | "yellow"; loading: boolean }>) {
  const tones = { blue: "border-blue-500/30 bg-blue-500/5 text-blue-500", green: "border-green-500/30 bg-green-500/5 text-green-500", purple: "border-purple-500/30 bg-purple-500/5 text-purple-500", yellow: "border-yellow-500/30 bg-yellow-500/5 text-yellow-500" };
  return (
    <Card className={tones[tone]}>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">{loading ? <Skeleton className="h-9 w-16" /> : <span className="text-3xl font-bold">{value ?? 0}</span>}{icon}</div>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function LinksStats({ data, loading }: Readonly<{ data: ServerLinksResponse | null; loading: boolean }>) {
  if (loading || !data) {
    return <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(item => <Skeleton key={item} className="h-40 rounded-lg" />)}</div>;
  }

  const accounts = data.members.flatMap(member => member.linked_accounts);
  const verificationRate = data.total_linked_accounts ? Math.round((data.verified_accounts / data.total_linked_accounts) * 100) : 0;
  const coverageRate = data.total_members ? Math.round((data.members_with_links / data.total_members) * 100) : 0;
  const shownTownHalls = [18, 17, 16, 15];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Link Statistics</h3>
        <p className="text-sm text-muted-foreground">Server-wide account coverage, verification, and player distribution.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-secondary/40">
          <CardHeader><CardTitle className="text-sm">Verification Rate</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Verified" value={data.verified_accounts} />
            <MetricRow label="Unverified" value={data.total_linked_accounts - data.verified_accounts} />
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-green-600" style={{ width: `${verificationRate}%` }} /></div>
            <p className="text-right text-xs text-muted-foreground">{verificationRate}% verified</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardHeader><CardTitle className="text-sm">Account Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="1 account" value={data.members.filter(member => member.account_count === 1).length} />
            <MetricRow label="2–3 accounts" value={data.members.filter(member => member.account_count >= 2 && member.account_count <= 3).length} />
            <MetricRow label="4+ accounts" value={data.members.filter(member => member.account_count >= 4).length} />
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardHeader><CardTitle className="text-sm">Town Hall Levels</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {shownTownHalls.map(townHall => (
              <div key={townHall} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Image src={townHallImageUrl(townHall)} alt="" width={20} height={20} unoptimized className="h-5 w-5 object-contain" />TH {townHall}</span>
                <span className="font-medium">{accounts.filter(account => account.town_hall === townHall).length}</span>
              </div>
            ))}
            <MetricRow label="Other" value={accounts.filter(account => account.town_hall && !shownTownHalls.includes(account.town_hall)).length} />
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardHeader><CardTitle className="text-sm">Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Linked members" value={`${data.members_with_links} / ${data.total_members}`} />
            <MetricRow label="Members without links" value={data.total_members - data.members_with_links} />
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${coverageRate}%` }} /></div>
            <p className="text-right text-xs text-muted-foreground">{coverageRate}% coverage</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader><CardTitle className="text-sm text-blue-400">Link Insights</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <MetricRow label="Average per linked member" value={data.members_with_links ? (data.total_linked_accounts / data.members_with_links).toFixed(2) : "0"} />
          <MetricRow label="Most linked accounts" value={Math.max(...data.members.map(member => member.account_count), 0)} />
          <MetricRow label="Total linked accounts" value={data.total_linked_accounts} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function MemberCard({ member, expanded, pendingAccount, onToggle, onAdd, onLoad }: Readonly<{ member: MemberLinks; expanded: boolean; pendingAccount: string | null; onToggle: () => void; onAdd: () => void; onLoad: (account: LinkedAccount) => void }>) {
  const previewAccounts = [...member.linked_accounts]
    .sort((left, right) => Number(Boolean(right.player_name && right.town_hall)) - Number(Boolean(left.player_name && left.town_hall)))
    .slice(0, 3);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-3 p-4">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {member.avatar_url ? <Image src={member.avatar_url} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{member.display_name}</span>
            <span className="block truncate text-sm text-muted-foreground">@{member.username} · {member.account_count} {member.account_count === 1 ? "account" : "accounts"}</span>
          </span>
          {!expanded && <span className="hidden max-w-[45%] gap-1.5 md:flex">{previewAccounts.map(account => (
            <Badge key={account.player_tag} variant="outline" title={account.player_tag} className="gap-1.5">
              {account.player_name && account.town_hall ? (
                <><Image src={townHallImageUrl(account.town_hall)} alt="" width={16} height={16} unoptimized className="h-4 w-4 object-contain" /><span>TH{account.town_hall} {account.player_name}</span></>
              ) : account.player_tag}
            </Badge>
          ))}</span>}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        <Button variant="outline" size="sm" onClick={onAdd}><Plus className="mr-1.5 h-4 w-4" />Add</Button>
      </div>
      {expanded && (
        <div className="border-t px-4 py-3">
          {member.linked_accounts.length ? <div className="divide-y">{member.linked_accounts.map(account => (
            <div key={account.player_tag} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {account.town_hall ? <Image src={townHallImageUrl(account.town_hall)} alt={`Town Hall ${account.town_hall}`} width={36} height={36} unoptimized className="h-9 w-9 object-contain" /> : <span className="flex h-9 w-9 items-center justify-center rounded bg-muted text-xs text-muted-foreground">?</span>}
              {account.player_name ? (
                <div className="min-w-0 flex-1">
                  <span className="block font-medium">{account.player_name}</span>
                  <span className="block text-sm text-muted-foreground">{account.player_tag}{account.town_hall ? ` · TH${account.town_hall}` : ""}</span>
                </div>
              ) : (
                <button type="button" onClick={() => onLoad(account)} disabled={pendingAccount === account.player_tag} className="min-w-0 flex-1 text-left disabled:opacity-60">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{account.player_tag}</span>
                    {pendingAccount === account.player_tag && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </span>
                  <span className="text-sm text-muted-foreground">Click to load missing player data</span>
                </button>
              )}
              <Badge variant={account.is_verified ? "default" : "secondary"}>{account.is_verified ? "Verified" : "Unverified"}</Badge>
            </div>
          ))}</div> : <p className="py-3 text-sm text-muted-foreground">No linked accounts. Use Add to create the first link.</p>}
        </div>
      )}
    </div>
  );
}

function MemberSkeleton() {
  return <div className="space-y-3">{[1, 2, 3, 4, 5].map(item => <div key={item} className="flex items-center gap-3 rounded-lg border p-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div><Skeleton className="h-8 w-20" /></div>)}</div>;
}
