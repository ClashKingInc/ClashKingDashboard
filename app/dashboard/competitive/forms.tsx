import { useTranslations } from "use-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Choice, Field, controlClass } from "./ui";
import type { Tournament } from "./api";

export const formats = [
  { value: "single_elimination", label: "singleElimination" },
  { value: "double_elimination", label: "doubleElimination" },
  { value: "round_robin", label: "roundRobin" },
  { value: "swiss", label: "swiss" },
  { value: "elo", label: "eloLeague" },
] as const;
export const sizes = [2, 3, 5, 10].map(size => ({ value: String(size), label: `${size} vs ${size}` }));

export type TournamentDraft = {
  name: string; format: string; teamSize: number; startsAt: string; endsAt: string;
  rules: { description: string; minTownHall: number; maxTownHall: number; maxRosterSize: number; prizeDescription: string; rulebookUrl: string; visibility: "public" | "unlisted"; };
};

function localDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TournamentForm({ open, onClose, submit, initial }: { open: boolean; onClose: () => void; submit: (value: TournamentDraft) => Promise<void>; initial?: Tournament }) {
  const t = useTranslations("CompetitivePage");
  const [name, setName] = useState(initial?.name ?? ""), [format, setFormat] = useState(initial?.format ?? "single_elimination"), [size, setSize] = useState(String(initial?.teamSize ?? 5));
  const [starts, setStarts] = useState(localDate(initial?.startsAt)), [ends, setEnds] = useState(localDate(initial?.endsAt)), [description, setDescription] = useState(String(initial?.rules.description ?? ""));
  const [minTownHall, setMinTownHall] = useState(String(initial?.rules.minTownHall ?? 1)), [maxTownHall, setMaxTownHall] = useState(String(initial?.rules.maxTownHall ?? 18));
  const [prizeDescription, setPrizeDescription] = useState(String(initial?.rules.prizeDescription ?? "")), [rulebookUrl, setRulebookUrl] = useState(String(initial?.rules.rulebookUrl ?? "")), [visibility, setVisibility] = useState<"public" | "unlisted">(initial?.rules.visibility === "unlisted" ? "unlisted" : "public");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}><DialogContent variant="form" className="scrollbar-custom max-h-[90dvh] overflow-y-auto border-0 sm:max-w-2xl"><DialogHeader><DialogTitle>{initial ? t("editTournament") : t("createTournament")}</DialogTitle><DialogDescription>{t("chooseAFormatAndDatesIndependentlyTeamsEnterAsTheirVerifiedClan")}</DialogDescription></DialogHeader>
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); setError("");
      const startTime = Date.parse(starts), endTime = Date.parse(ends);
      // The shared picker stores local wall-clock text and has no native
      // required validation. Validate both values before converting to UTC.
      if (!starts.trim() || !ends.trim() || !Number.isFinite(startTime) || !Number.isFinite(endTime)) { setError(t("chooseValidStartAndEnd")); return; }
      if (endTime <= startTime) { setError(t("theEndMustBeAfterTheStart")); return; }
      if (Number(minTownHall) > Number(maxTownHall)) { setError(t("minimumTownHallMustNotExceedMaximumTownHall")); return; }
      setSaving(true);
      try { await submit({ name: name.trim(), format, teamSize: Number(size), startsAt: new Date(startTime).toISOString(), endsAt: new Date(endTime).toISOString(), rules: { description, minTownHall: Number(minTownHall), maxTownHall: Number(maxTownHall), maxRosterSize: Number(size), prizeDescription: prizeDescription.trim(), rulebookUrl: rulebookUrl.trim(), visibility } }); onClose(); }
      catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotCreateTournament")); }
      finally { setSaving(false); }
    }}>
      <Field label={t("tournamentName")}><Input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={controlClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label={t("format")}><Choice value={format} onChange={setFormat} choices={formats.map(choice => ({ ...choice, label: t(choice.label) }))} disabled={Boolean(initial)} /></Field><Field label={t("matchSize")}><Choice value={size} onChange={setSize} choices={sizes.map(choice => ({ ...choice, label: t("sizeVersusSize", { size: Number(choice.value) }) }))} disabled={Boolean(initial)} /></Field><Field label={t("startsYourLocalTime")}><DateTimePicker type="datetime-local" value={starts} onChange={event => setStarts(event.target.value)} aria-label={t("startsYourLocalTime")} placeholder={t("startsYourLocalTime")} disabled={saving} /></Field><Field label={t("endsYourLocalTime")}><DateTimePicker type="datetime-local" value={ends} onChange={event => setEnds(event.target.value)} aria-label={t("endsYourLocalTime")} placeholder={t("endsYourLocalTime")} disabled={saving} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label={t("minimumTownHall")}><Input required type="number" min={1} max={18} value={minTownHall} onChange={event => setMinTownHall(event.target.value)} className={controlClass} /></Field><Field label={t("maximumTownHall")}><Input required type="number" min={1} max={18} value={maxTownHall} onChange={event => setMaxTownHall(event.target.value)} className={controlClass} /></Field></div>
      <Field label={t("rules")}><Textarea value={description} maxLength={8000} onChange={event => setDescription(event.target.value)} placeholder={t("warRulesCheckInRequirementsSubstitutions")} className={controlClass} /></Field>
      <Field label={t("prizes")} hint={t("prizeDescriptionHint")}><Textarea value={prizeDescription} maxLength={1000} onChange={event => setPrizeDescription(event.target.value)} className={controlClass} /></Field>
      <Field label={t("rulebookLink")} hint={t("rulebookHint")}><Input type="url" pattern="https://.+" value={rulebookUrl} maxLength={2048} onChange={event => setRulebookUrl(event.target.value)} placeholder="https://…" className={controlClass} /></Field>
      <Field label={t("visibility")} hint={t("visibilityHint")}><Choice value={visibility} onChange={value => setVisibility(value as "public" | "unlisted")} choices={[{ value: "public", label: t("publicTournament") }, { value: "unlisted", label: t("unlistedTournament") }]} /></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={onClose}>{t("cancel")}</Button><Button disabled={saving || !name.trim()}>{saving ? t("saving") : initial ? t("saveTournament") : t("createTournament")}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
