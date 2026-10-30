import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";
import type { TicketPanel } from "@/lib/api/types/tickets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api/client";
import { transcriptTabUrl } from "@/lib/ticket-transcript-link";
import { apiCache } from "@/lib/api-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { InfoPopover } from "@/components/ui/info-popover";
import { townHallImageUrl } from "@/lib/theme";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";

type Record = NonNullable<TicketPanel["activity"]>["recent"][number];
function StatusLabel({ status }: { readonly status: string }) {
  const t = useTranslations("TicketsSettingsPage");
  return <span className="inline-flex items-center gap-2"><span aria-hidden="true">{status === "open" ? "✅" : status === "sleep" ? "💤" : "❌"}</span>{t(status === "open" ? "statusOpen" : status === "sleep" ? "statusSleeping" : "statusClosed")}</span>;
}
function TicketActions({ record, guildId, transcriptsEnabled, children }: { readonly record: Record; readonly guildId: string; readonly transcriptsEnabled: boolean; readonly children: (path: string | null | undefined) => ReactNode }) {
  const t = useTranslations("TicketsSettingsPage"), client = useQueryClient();
  const tCommon = useTranslations("Common");
  const [closeOpen, setCloseOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(record.active_job_id ?? null), [submitting, setSubmitting] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (record.active_job_id) { setJobId(record.active_job_id); setError(""); } }, [record.active_job_id]);
  const job = useQuery({ queryKey: ["ticket-action", guildId, record.id, jobId], enabled: !!jobId, queryFn: async () => {
    const response = await apiClient.tickets.getAction(guildId, record.id, jobId!);
    if (!response.data || response.error) throw new Error(response.error ?? t("actionFailed"));
    return response.data;
  }, refetchInterval: query => query.state.data && ["completed", "failed"].includes(query.state.data.state) ? false : 2000 });
  useEffect(() => {
    if (job.data?.state === "completed") {
      apiCache.invalidate(`ticket-panels-${guildId}`);
      void client.invalidateQueries({ queryKey: dashboardQueryKeys.route("ticket-panels", guildId) });
    }
  }, [job.data?.state, client, guildId]);
  const pending = submitting || !!jobId && (!job.data || ["pending", "running"].includes(job.data.state)) && !job.error;
  const run = async (action: "set_status" | "capture_transcript" | "delete_ticket", status?: "open" | "sleep" | "closed") => {
    setSubmitting(true); setError("");
    const id = crypto.randomUUID();
    try {
      const response = await apiClient.tickets.runAction(guildId, record.id, { id, action, ...(status ? { status } : {}) });
      if (response.error || !response.data) throw new Error(response.error ?? t("actionFailed"));
      setJobId(id);
    } catch (cause) {
      // A lost response may still have committed the job. Look up the same
      // identity rather than offering an immediate duplicate action.
      setJobId(id); setError(cause instanceof Error ? cause.message : t("actionFailed"));
      apiCache.invalidate(`ticket-panels-${guildId}`);
      void client.invalidateQueries({ queryKey: dashboardQueryKeys.route("ticket-panels", guildId) });
    }
    finally { setSubmitting(false); }
  };
  const path = typeof job.data?.result.transcript_path === "string" ? job.data.result.transcript_path : record.transcript_path;
  const closed = ["delete", "closed"].includes(record.status);
  return <div className="w-full space-y-2"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
    <div className="shrink-0">
    <><Select value={closed ? "closed" : record.status} disabled={closed || pending} onValueChange={value => { if (value === "closed") setCloseOpen(true); else if (value !== record.status) void run("set_status", value as "open" | "sleep"); }}>
      <SelectTrigger className="h-9 w-36 border-0 bg-muted/55" aria-label={t("changeStatus")}><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="open"><StatusLabel status="open" /></SelectItem><SelectItem value="sleep"><StatusLabel status="sleep" /></SelectItem><SelectItem value="closed"><StatusLabel status="closed" /></SelectItem>
      </SelectContent></Select>
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("closeTicketTitle", { number: record.number })}</AlertDialogTitle><AlertDialogDescription>{t(transcriptsEnabled ? "deleteTicketWithTranscript" : "deleteTicketWithoutTranscript")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void run("set_status", "closed")}>{t("closeTicket")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent></AlertDialog></>
    </div>
    <div className="min-w-0 flex-1">{children(path)}</div>
  </div>
    {pending && <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />{t("actionPending")}</span>}
    {(error || job.error || job.data?.state === "failed") && <p role="alert" className="text-xs text-destructive">{error || job.error?.message || job.data?.last_error || t("actionFailed")}</p>}</div>;
}

function TranscriptViewer({ path }: { readonly path: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const url = transcriptTabUrl(path);
  return url ? <Button size="sm" variant="secondary" asChild><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><FileText className="h-4 w-4" />{t("viewTranscript")}</a></Button> : null;
}

export function TicketActivity({ panel, guildId }: { readonly panel: TicketPanel; readonly guildId: string }) {
  const t = useTranslations("TicketsSettingsPage"), locale = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const activity = panel.activity;
  const records = useMemo(() => (activity?.recent ?? []).filter(record => {
    const query = search.trim().toLocaleLowerCase();
    return (status === "all" || status === record.status || status === "closed" && record.status === "delete") && (!query || [String(record.number), record.applicant_user_id,
      ...record.accounts.flatMap(account => [account.name, account.tag])].some(value => value?.toLocaleLowerCase().includes(query)));
  }), [activity, search, status]);
  if (!activity) return <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">{t("activityUnavailable")}</p>;
  const fullDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
  const date = (value: string) => {
    const instant = new Date(value);
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      ...(instant.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } as const : {}) }).format(instant);
  };
  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-3xl bg-card px-5 py-4 lg:grid-cols-4">
      {[[t("openedTickets"), activity.total], [t("statusOpen"), activity.open], [t("applicants"), activity.applicants], [t("applicantAccounts"), activity.accounts]].map(([label, value]) =>
        <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}
    </div>
    {activity.townhalls.some(item => item.level !== null) && <section className="rounded-3xl bg-card p-5">
      <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{t("applicantTownhalls")}</h3><InfoPopover label={t("applicantTownhalls")} content={t("townhallCurrentHint")} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {activity.townhalls.filter(item => item.level !== null).map(item => <Badge key={item.level} variant="secondary" className="gap-3 px-3 py-2">
          {item.level === null ? t("unknownTownhall") : <img src={townHallImageUrl(item.level)} alt={`TH${item.level}`} width={28} height={28} className="h-7 w-7 object-contain" />}<span className="tabular-nums">{item.count}</span>
        </Badge>)}
      </div>
    </section>}
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">{t("ticketHistory")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("recentTicketsHint", { count: activity.recent.length, total: activity.total })}</p></div>
        <div className="flex gap-2">
          <Input aria-label={t("searchApplicants")} placeholder={t("searchApplicants")} value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5 sm:w-60" />
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36 shrink-0 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5" aria-label={t("ticketStatus")}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("allTickets")}</SelectItem>{["open", "sleep", "closed"].map(value => <SelectItem key={value} value={value}><StatusLabel status={value} /></SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {records.length === 0 ? <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground">{t("noTickets")}</p> : records.map(record =>
        <article key={record.id} className="rounded-3xl bg-card px-5 py-3 shadow-sm shadow-black/5">
          <TicketActions record={record} guildId={guildId} transcriptsEnabled={panel.transcripts_enabled !== false}>
          {path => <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h4 className="text-xs font-medium text-muted-foreground">#{record.number}</h4>
              {record.applicant_user_id && <DiscordUserDisplay userId={record.applicant_user_id} username={record.applicant_username} avatarUrl={record.applicant_avatar_url} showPopover={false} size="md" />}
            </div>
            {record.accounts.length > 0 && <div className="flex flex-wrap items-center gap-3">{record.accounts.map(account => <div key={account.tag} className="flex items-center gap-2 text-xs">
              {account.townhall_level !== null && <img src={townHallImageUrl(account.townhall_level)} alt={`TH${account.townhall_level}`} width={20} height={20} className="h-5 w-5 object-contain" />}
              <span className="font-medium">{account.name ?? "—"}</span>
            </div>)}</div>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-4">
              {path && <TranscriptViewer path={path} />}
            <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs font-normal text-muted-foreground lg:flex-col lg:items-end">
              <time dateTime={record.created_at} title={fullDate(record.created_at)}>{t("openedAt", { time: date(record.created_at) })}</time>
              {record.closed_at && ["closed", "delete"].includes(record.status) && <time dateTime={record.closed_at} title={fullDate(record.closed_at)}>{t("closedAt", { time: date(record.closed_at) })}</time>}
            </div>
            </div>
          </div>}
          </TicketActions>
        </article>)}
    </section>
  </div>;
}
