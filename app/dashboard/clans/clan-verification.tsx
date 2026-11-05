"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClanVerificationEndpoint, StartClanVerificationEndpoint, CheckClanVerificationEndpoint } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { Button } from "@/components/ui/button";
import { InfoPopover } from "@/components/ui/info-popover";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { clashKingColors } from "@/lib/theme";

/** Same badge vocabulary as the app's linked player cards; status remains server-scoped. */
export function ClanVerificationIcon({ guildId, clanTag, onClick }: { guildId: string; clanTag: string; onClick: () => void }) {
  const report = useQuery({
    queryKey: ["clan-verification", guildId, clanTag],
    queryFn: ({ signal }) => executeSharedEndpoint(ClanVerificationEndpoint, { path: { serverId: guildId, clanTag }, query: {}, body: {} }, { signal }),
    enabled: Boolean(guildId && clanTag),
    staleTime: 30_000,
    refetchInterval: query => query.state.data?.state === "pending" ? 15_000 : false,
  });
  // An unavailable status is not evidence that a clan is unverified.
  if (!report.data || report.isError) return null;
  const verified = report.data.state === "verified";
  const label = verified ? "Verified clan" : report.data.state === "pending" ? "Clan verification pending" : "Verify clan";
  return <button type="button" onClick={onClick} aria-label={label} title={label}
    className="absolute -bottom-0.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/50 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    {verified ? <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" color={clashKingColors.verifiedGreen} /> : <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5 text-orange-500" />}
  </button>;
}

export function ClanVerificationControl({ guildId, clanTag, autoStart = false }: { guildId: string; clanTag: string; autoStart?: boolean }) {
  const client = useQueryClient(), { canManage } = useDashboardAccess();
  const manage = canManage("clans"), key = ["clan-verification", guildId, clanTag];
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const started = useRef(false);
  const input = { path: { serverId: guildId, clanTag }, query: {}, body: {} };
  const report = useQuery({ queryKey: key, queryFn: async ({ signal }) => {
    const result = await executeSharedEndpoint(ClanVerificationEndpoint, input, { signal });
    if (manage && result.state === "pending" && result.checkAfter && Date.parse(result.checkAfter) <= Date.now()) {
      return executeSharedEndpoint(CheckClanVerificationEndpoint, input, { signal });
    }
    return result;
  }, refetchInterval: query => query.state.data?.state === "pending" ? 15000 : false });
  const begin = async () => {
    setSaving(true); setError("");
    try { client.setQueryData(key, await executeSharedEndpoint(StartClanVerificationEndpoint, input)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start verification"); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    if (autoStart && manage && report.data?.state === "unverified" && !started.current) { started.current = true; void begin(); }
  });
  useEffect(() => {
    if (report.data?.state === "verified") void client.invalidateQueries({ queryKey: ["clan-links", guildId] });
  }, [client, guildId, report.data?.state]);
  const state = report.data;
  return <section className="space-y-3">
    <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">Clan verification</h3><InfoPopover label="About clan verification" content="Verify that this clan belongs on your server by temporarily adding a word to its description. Verified clans reveal hidden account links in the clan roster. After verification succeeds, you can remove the word." />{state?.state === "verified" && <Badge variant="secondary"><ShieldCheck className="mr-1 h-3.5 w-3.5" color={clashKingColors.verifiedGreen} />Verified</Badge>}</div>
    {report.isPending ? <p className="text-sm text-muted-foreground">Loading verification…</p> : state?.state === "verified" ? null : state?.state === "pending" ? <>
      <p className="text-sm text-muted-foreground">Add this word to the clan's description. Keep it there until verification succeeds.</p>
      <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-muted/55 px-3 py-2 text-sm select-all">{state.marker}</code><Button type="button" size="icon" variant="secondary" aria-label="Copy verification word" onClick={() => void navigator.clipboard.writeText(state.marker ?? "").catch(() => setError("Could not copy the word; select it and copy manually."))}><Copy className="h-4 w-4" /></Button></div>
      <p role="status" className="text-sm text-muted-foreground">We’ll start checking after about 2 minutes, then check every minute. This word expires at {state.expiresAt ? new Date(state.expiresAt).toLocaleTimeString() : "—"} (30 minutes after starting).</p>
      {state.lastCheckedAt && <p className="text-xs text-muted-foreground">Not found yet. Last checked at {new Date(state.lastCheckedAt).toLocaleTimeString()}.</p>}
    </> : <>
      {state?.state === "expired" && <p role="status" className="text-sm text-muted-foreground">The word expired. Start again for a new word.</p>}
      {manage && <Button type="button" variant="secondary" disabled={saving || Boolean(report.error)} onClick={() => void begin()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{state?.state === "expired" ? "Start again" : "Verify clan"}</Button>}
    </>}
    {(error || report.error) && <p role="alert" className="text-sm text-destructive">{error || report.error?.message}<Button type="button" size="sm" variant="secondary" className="ml-2" onClick={() => void report.refetch()}>Retry</Button></p>}
  </section>;
}
