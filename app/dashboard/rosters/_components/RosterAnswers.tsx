"use client";
import { Pencil } from "lucide-react";
import Image from "@/components/app-image";
import { townHallImageUrl } from "@/lib/clash-asset-urls";
import { useState } from "react";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Roster, RosterMember } from "../_lib/types";

export function RosterAnswers({ roster, onSaved }: { roster: Roster; onSaved: () => Promise<void> }) {
  const [member, setMember] = useState<RosterMember>();
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const questions = roster.signup_questions ?? [];
  const save = async () => {
    if (!member) return;
    setSaving(true); setError("");
    try {
      await executeSharedEndpoint(dashboardEndpoints.dashboardUpdateRosterMember, { path: { rosterId: roster.id, memberTag: member.tag }, query: { server_id: roster.server_id }, body: { answers } });
      await onSaved(); setMember(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save answers"); }
    finally { setSaving(false); }
  };
  if (!questions.length) return <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">Add signup questions in Settings to collect answers.</p>;
  return <><div className="scrollbar-custom overflow-x-auto rounded-2xl bg-card p-4"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Account</th>{questions.map(question => <th className="p-3" key={question.id}>{question.label}</th>)}<th className="w-12 p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {(roster.members ?? []).map(row => <tr key={row.tag}><td className="p-3 whitespace-nowrap"><span className="flex items-center gap-3"><Image src={townHallImageUrl(row.townhall)} alt={`Town Hall ${row.townhall}`} width={32} height={32} /><span>{row.name}<span className="block text-xs text-muted-foreground">{row.tag}</span></span></span></td>{questions.map(question => { const value = row.signup_answers?.[question.id]; return <td className="max-w-xs p-3 break-words" key={question.id}>{value === true ? "Yes" : value === false ? "No" : value == null || value === "" ? "—" : String(value)}</td>; })}<td className="p-3"><Button variant="ghost" size="icon" aria-label={`Edit answers for ${row.name}`} onClick={() => { setMember(row); setAnswers(Object.fromEntries(Object.entries(row.signup_answers ?? {}).filter((entry): entry is [string, string | boolean] => typeof entry[1] === "string" || typeof entry[1] === "boolean"))); setError(""); }}><Pencil className="h-4 w-4" /></Button></td></tr>)}
  </tbody></table></div>
    <Dialog open={Boolean(member)} onOpenChange={open => { if (!open && !saving) setMember(undefined); }}><DialogContent variant="form"><DialogHeader><DialogTitle>{member?.name}: signup answers</DialogTitle><DialogDescription>Administrative edits are logged with your identity. Unanswered fields are allowed for manually added members.</DialogDescription></DialogHeader>
      <div className="space-y-4">{questions.map(question => <div className="space-y-2" key={question.id}><Label>{question.label}</Label>{question.type === "text" ? <Input maxLength={1000} value={String(answers[question.id] ?? "")} onChange={event => setAnswers(previous => ({ ...previous, [question.id]: event.target.value }))} /> : <Select value={answers[question.id] === undefined ? "unset" : question.type === "boolean" ? String(answers[question.id]) : String(question.options?.indexOf(String(answers[question.id])))} onValueChange={value => setAnswers(previous => { const next = { ...previous }; if (value === "unset") delete next[question.id]; else next[question.id] = question.type === "boolean" ? value === "true" : question.options![Number(value)]; return next; })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">Unanswered</SelectItem>{question.type === "boolean" ? <><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></> : question.options?.map((option, index) => <SelectItem key={index} value={String(index)}>{option}</SelectItem>)}</SelectContent></Select>}</div>)}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save answers"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
