import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import type { TicketMessageTemplate } from "@clashking/api-contracts";
import { ticketApprovalTokens } from "@clashking/api-contracts";
import { Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoPopover } from "@/components/ui/info-popover";
import { useToast } from "@/components/ui/use-toast";
import { nativePanelMessage } from "./ticket-panel-message";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

const MessageEditor = lazy(() => import("@/components/dashboard/embed-editor").then(module => ({ default: module.EmbedEditor })));
type Template = typeof TicketMessageTemplate.Type;
const placeholders = ticketApprovalTokens;

export function TicketMessageLibrary({ guildId }: { readonly guildId: string }) {
  const t = useTranslations("TicketsSettingsPage"), common = useTranslations("Common"), { toast } = useToast(), client = useQueryClient();
  const queryKey = ["ticket-message-library", guildId];
  const query = useQuery({ queryKey, queryFn: async () => {
    const response = await apiClient.tickets.getMessageLibrary(guildId);
    if (response.error || !response.data) throw new Error(response.error ?? common("loadError"));
    return response.data;
  }, enabled: !!guildId });
  const [draft, setDraft] = useState<Template | null>(null), [busy, setBusy] = useState(false), [editorVersion, setEditorVersion] = useState(0);
  const [error, setError] = useState("");
  const [formatChosen, setFormatChosen] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false), [nextTemplate, setNextTemplate] = useState<Template | null>(null), [deleteOpen, setDeleteOpen] = useState(false);
  const items = query.data?.items ?? [];
  const select = (template: Template) => { setDraft(template); setFormatChosen(!!(template.message.content || template.message.embeds?.length || template.message.components?.length)); setError(""); setEditorDirty(false); setEditorVersion(value => value + 1); };
  const choose = (template: Template) => {
    const saved = items.find(item => item.id === draft?.id);
    if (draft && (editorDirty || !saved || draft.name !== saved.name || JSON.stringify(draft.questions) !== JSON.stringify(saved.questions))) setNextTemplate(template);
    else select(template);
  };
  const add = () => choose({ id: crypto.randomUUID(), name: "", message: { content: "" }, questions: [] });
  const save = async (payload: Record<string, unknown>) => {
    if (!draft || !query.data) return;
    setBusy(true); setError("");
    try {
      const template = { ...draft, name: draft.name.trim(), message: nativePanelMessage(payload) };
      const next = items.some(item => item.id === template.id) ? items.map(item => item.id === template.id ? template : item) : [...items, template];
      const response = await apiClient.tickets.saveMessageLibrary(guildId, { items: next, expected_revision: query.data.revision });
      if (response.error) throw new Error(response.error);
      setDraft(template);
      await client.invalidateQueries({ queryKey });
      toast({ title: common("success"), description: t("messagesSaved") });
    } catch (cause) { setError(cause instanceof Error ? cause.message : common("loadError")); throw cause; }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!draft || !query.data) return;
    if (!items.some(item => item.id === draft.id)) { setDraft(null); return; }
    setBusy(true);
    try {
      const response = await apiClient.tickets.saveMessageLibrary(guildId, { items: items.filter(item => item.id !== draft.id), expected_revision: query.data.revision });
      if (response.error) throw new Error(response.error);
      setDraft(null); await client.invalidateQueries({ queryKey });
    } catch (cause) { setError(cause instanceof Error ? cause.message : common("loadError")); }
    finally { setBusy(false); }
  };
  if (query.isPending) return <Skeleton className="h-64 rounded-3xl" />;
  if (query.error) return <div role="alert" className="space-y-3 text-sm"><p>{query.error.message}</p><Button variant="secondary" onClick={() => query.refetch()}>{common("retry")}</Button></div>;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{t("sharedMessages")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("sharedMessagesHint")}</p></div>
      <Button onClick={add} disabled={busy || items.length >= 25}><Plus className="h-4 w-4" />{t("addMessage")}</Button></div>
    <div className="min-w-0 space-y-5">
      {items.length > 0 && <Select disabled={busy} value={items.some(item => item.id === draft?.id) ? draft?.id : ""} onValueChange={id => {
        const template = items.find(item => item.id === id); if (template) choose(template);
      }}><SelectTrigger aria-label={t("chooseMessage")} className="w-full rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5 sm:max-w-sm"><SelectValue placeholder={draft ? t("addMessage") : t("chooseMessage")} /></SelectTrigger>
        <SelectContent>{items.map(template => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>}
      {!draft ? <div className="rounded-3xl bg-card p-8 text-sm text-muted-foreground">{items.length ? t("chooseMessage") : t("noSharedMessages")}</div> : <div className="min-w-0 space-y-4" aria-busy={busy}>
        {formatChosen && <><fieldset disabled={busy} className="flex items-end gap-3"><div className="flex-1 space-y-2"><Label htmlFor="ticket-template-name">{t("messageName")}</Label>
          <Input id="ticket-template-name" value={draft.name} maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} className="border-0 bg-muted/55" /></div>
          <Button variant="ghost" aria-label={common("delete")} onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button></fieldset>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{t("placeholders")}<InfoPopover label={t("placeholders")} content={<div className="space-y-2"><p>{t("placeholderHint")}</p><div className="flex flex-wrap gap-1.5">{placeholders.map(token => <code key={token} className="rounded-lg bg-muted px-2 py-1 text-xs">{`{${token}}`}</code>)}</div></div>} /></div>
        <fieldset disabled={busy} className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h3 className="text-sm font-medium">{t("customQuestions")}</h3><InfoPopover label={t("customQuestions")} content={t("customQuestionHint", { arrival_date: "{arrival_date}" })} /></div>
          <Button size="sm" variant="ghost" disabled={draft.questions.length >= 25} onClick={() => {
            let number = 1; while (draft.questions.some(question => question.key === `answer_${number}`)) number++;
            setDraft({ ...draft, questions: [...draft.questions, { key: `answer_${number}`, label: "" }] });
          }}><Plus className="h-4 w-4" />{t("addQuestion")}</Button></div>
          {draft.questions.map((question, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-muted/35 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
            <Input aria-label={t("placeholderKey")} placeholder={t("placeholderKey")} value={question.key} maxLength={40} onChange={event => setDraft({ ...draft, questions: draft.questions.map((item, position) => position === index ? { ...item, key: event.target.value } : item) })} />
            <Input className="col-start-1 row-start-2 sm:col-auto sm:row-auto" aria-label={t("questionLabel")} placeholder={t("questionLabel")} value={question.label} maxLength={45} onChange={event => setDraft({ ...draft, questions: draft.questions.map((item, position) => position === index ? { ...item, label: event.target.value } : item) })} />
            <Button className="col-start-2 row-span-2 row-start-1 sm:col-auto sm:row-span-1 sm:row-auto" variant="ghost" size="icon" aria-label={common("delete")} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, position) => position !== index) })}><Trash2 className="h-4 w-4" /></Button></div>)}
        </fieldset></>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="min-w-0 rounded-3xl bg-card"><Suspense fallback={<Skeleton className="h-96" />}>
          <MessageEditor key={`${draft.id}:${editorVersion}`} variant="ticket-panel" serverId={guildId} placeholders={[...placeholders, ...draft.questions.map(question => question.key)]} initialData={draft.message} isSaving={busy} onSave={save} onDirtyChange={setEditorDirty} onFormatChosen={() => setFormatChosen(true)} onCancel={() => {
            const saved = items.find(item => item.id === draft.id); if (saved) select(saved); else setDraft(null);
          }} />
        </Suspense></div>
      </div>}
    </div>
    <AlertDialog open={!!nextTemplate} onOpenChange={open => { if (!open) setNextTemplate(null); }}><AlertDialogContent><AlertDialogHeader>
      <AlertDialogTitle>{t("unsavedMessage")}</AlertDialogTitle><AlertDialogDescription>{t("unsavedMessageHint")}</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{common("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { if (nextTemplate) select(nextTemplate); setNextTemplate(null); }}>{t("discardChanges")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("deleteSharedMessage")}</AlertDialogTitle><AlertDialogDescription>{t("deleteSharedMessageHint")}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{common("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { setDeleteOpen(false); void remove(); }}>{common("delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
