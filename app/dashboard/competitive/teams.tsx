import { useTranslations, useLocale } from "use-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Archive, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { competitiveApi, type Overview, type Team } from "./api";
import { Artwork, Choice, Empty, Field, Pill, controlClass, dateLabel, rowClass } from "./ui";
import { sizes } from "./forms";

export function TeamsPanel({ serverId, overview, manage, refresh }: { serverId: string; overview: Overview; manage: boolean; refresh: () => Promise<void> }) {
  const t = useTranslations("CompetitivePage"), locale = useLocale();
  const [editing, setEditing] = useState<Team | "new" | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [archive, setArchive] = useState<Team | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const teamReport = useQuery({ queryKey: ["competitive", serverId, "teams"], queryFn: ({ signal }) => competitiveApi.teams(serverId, signal) });
  const teams = teamReport.data?.items ?? overview.teams;
  const current = teams.find(team => team.id === selected);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await Promise.all([refresh(), teamReport.refetch()]); }
    catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotUpdateTeam")); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 space-y-5"><div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 sm:flex-1"><h2 className="text-lg font-semibold">{t("persistentTeams")}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{t("buildMultipleLineupsForAVerifiedClanPlayersAlwaysSeeTheClansName")}</p></div>{manage && <Button className="shrink-0 self-start" onClick={() => setEditing("new")} disabled={!overview.verifiedClans.length}><Plus className="mr-2 h-4 w-4" />{t("createTeam")}</Button>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {teamReport.error && <p role="alert" className="text-sm text-destructive">{t("membershipHistoryCouldNotLoad")}{" "}{teamReport.error.message}<Button variant="secondary" size="sm" className="ml-2" onClick={() => void teamReport.refetch()}>{t("retry")}</Button></p>}
    {!overview.verifiedClans.length && <Empty>{t("verifyAClanInClansBeforeCreatingItsTeams")}</Empty>}
    {!teams.length && overview.verifiedClans.length > 0 && <Empty>{t("noTeamsYetCreateYourFirstClanLineup")}</Empty>}
    <div className="min-w-0 space-y-3">{teams.map(team => <article key={team.id} className={rowClass}>
      <div className="grid min-w-0 grid-cols-[38px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[38px_minmax(0,1fr)_auto] sm:items-center">
        <Artwork kind="teams" size={38} />
        <button className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelected(selected === team.id ? null : team.id)} aria-expanded={selected === team.id}>
          <span className="block break-words font-semibold">{team.clanName}</span><span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">{team.internalName} · {team.clanTag}</span>
        </button>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
          <div className="flex min-w-0 flex-wrap items-center gap-2"><Pill>{team.size}{" "}{t("vs")}{" "}{team.size}</Pill><Pill active={!team.archived}>{team.archived ? t("archived") : t("memberCount", { count: team.members.length })}</Pill></div>
          {manage && <div className="flex shrink-0 items-center gap-1"><Button size="icon" variant="ghost" aria-label={t("renameTeamName", { name: team.internalName })} disabled={busy} onClick={() => setEditing(team)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={team.archived ? t("restoreTeamName", { name: team.internalName }) : t("archiveTeamName", { name: team.internalName })} disabled={busy} onClick={() => setArchive(team)}><Archive className="h-4 w-4" /></Button></div>}
        </div>
      </div>
      {current?.id === team.id && <div className="mt-5 min-w-0 space-y-4 rounded-2xl bg-muted/35 p-4"><div className="min-w-0 space-y-3">{team.members.length ? team.members.map(member => <div key={member.playerTag} className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center">
        <Avatar className="h-8 w-8"><AvatarImage src={member.profile?.avatarUrl ?? undefined} /><AvatarFallback>{(member.profile?.displayName ?? member.name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
        <div className="min-w-0"><span className="block break-words text-sm font-medium">{member.name || member.playerTag}</span><span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">{member.playerTag} · {member.acceptedAt ? t("accepted") : t("invitationPending")}{member.profile ? ` · ${member.profile.displayName}` : ""}</span></div>
        {manage && !team.archived && <Button className="col-start-2 justify-self-end sm:col-start-auto" size="icon" variant="ghost" aria-label={t("removeMemberName", { name: member.name || member.playerTag })} disabled={busy} onClick={() => void mutate(() => competitiveApi.removeMember(serverId, team.id, member.playerTag))}><UserMinus className="h-4 w-4" /></Button>}
      </div>) : <p className="text-sm text-muted-foreground">{t("noPlayersInvitedYet")}</p>}</div>
        {manage && !team.archived && <MemberForm disabled={busy} add={tag => mutate(() => competitiveApi.addMember(serverId, team.id, tag))} />}
        <details><summary className="cursor-pointer text-sm font-medium">{t("joinAndLeaveHistory")}</summary><div className="mt-3 space-y-2">{teamReport.data?.history.filter(item => item.teamId === team.id).map((item, index) => <p key={`${item.playerTag}-${item.joinedAt}-${index}`} className="break-words text-xs leading-5 text-muted-foreground">{item.playerTag}{" "}{t("joined")}{" "}{dateLabel(item.joinedAt, locale)} · {item.leftAt ? t("leftDate", { date: dateLabel(item.leftAt, locale) }) : t("currentMember")}</p>)}{!teamReport.data?.history.some(item => item.teamId === team.id) && <p className="text-xs text-muted-foreground">{t("noRecordedHistory")}</p>}</div></details>
      </div>}
    </article>)}</div>
    {editing && manage && <TeamForm team={editing === "new" ? null : editing} clans={overview.verifiedClans} close={() => setEditing(null)} save={async body => { if (editing === "new") await competitiveApi.createTeam(serverId, body); else await competitiveApi.updateTeam(serverId, editing.id, { internalName: body.internalName }); await Promise.all([refresh(), teamReport.refetch()]); }} />}
    <AlertDialog open={manage && Boolean(archive)} onOpenChange={open => { if (!open) setArchive(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{archive?.archived ? t("restoreTeam") : t("archiveTeam")}</AlertDialogTitle><AlertDialogDescription>{archive?.archived ? t("theTeamCanAcceptMembersAndEnterFutureTournamentsAgain") : t("archivedTeamsKeepTheirHistoryATeamParticipatingInAnActiveEventCannotBeArchived")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { if (archive) void mutate(() => competitiveApi.updateTeam(serverId, archive.id, { archived: !archive.archived })); setArchive(null); }}>{archive?.archived ? t("restore") : t("archive")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function MemberForm({ disabled, add }: { disabled: boolean; add: (tag: string) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [tag, setTag] = useState("");
  return <form className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={event => { event.preventDefault(); void add(tag.trim().toUpperCase()); }}><Field label={t("playerTag")}><Input required value={tag} onChange={event => setTag(event.target.value.trim().toUpperCase())} autoCapitalize="characters" spellCheck={false} placeholder="#PlayerTag" pattern="#[0289PYLQGRJCUV]+" className={controlClass} /></Field><Button variant="secondary" disabled={disabled || !tag.trim()}>{t("invitePlayer")}</Button></form>;
}

function TeamForm({ team, clans, close, save }: { team: Team | null; clans: Overview["verifiedClans"]; close: () => void; save: (body: { clanTag: string; internalName: string; size: number }) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [clan, setClan] = useState(team?.clanTag ?? clans[0]?.tag ?? ""), [name, setName] = useState(team?.internalName ?? ""), [size, setSize] = useState(String(team?.size ?? 5));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <Dialog open onOpenChange={open => { if (!open && !busy) close(); }}><DialogContent variant="form" className="border-0"><DialogHeader><DialogTitle>{team ? t("renameTeam") : t("createTeam")}</DialogTitle><DialogDescription>{t("internalNamesHelpOrganizersDistinguishLineupsPublicTeamNamesAlwaysMatchTheClan")}</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await save({ clanTag: clan, internalName: name.trim(), size: Number(size) }); close(); } catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotSaveTeam")); } finally { setBusy(false); } }}><Field label={t("verifiedClan")}><Choice value={clan} onChange={setClan} choices={clans.map(item => ({ value: item.tag, label: `${item.name} · ${item.tag}` }))} disabled={Boolean(team)} /></Field><Field label={t("internalNameAdministratorsOnly")}><Input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder={t("weekendLineup")} className={controlClass} /></Field><Field label={t("matchSize")}><Choice value={size} onChange={setSize} choices={sizes.map(choice => ({ ...choice, label: t("sizeVersusSize", { size: Number(choice.value) }) }))} disabled={Boolean(team)} /></Field>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" type="button" disabled={busy} onClick={close}>{t("cancel")}</Button><Button disabled={busy || !clan || !name.trim()}>{busy ? t("saving") : t("saveTeam")}</Button></div></form></DialogContent></Dialog>;
}
