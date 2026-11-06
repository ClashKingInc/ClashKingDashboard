import { useTranslations } from "use-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { competitiveApi, permissionNames, type Grant, type Permission } from "./api";
import { Choice, Empty, Field, Pill, rowClass } from "./ui";

export function PermissionsPanel({ serverId, manage, refresh }: { serverId: string; manage: boolean; refresh: () => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const roles = useQuery(dashboardQueryOptions.roles(serverId));
  const grants = useQuery({ queryKey: ["competitive", serverId, "permissions"], queryFn: ({ signal }) => competitiveApi.permissions(serverId, signal) });
  if (grants.isPending || roles.isPending) return <Empty>{t("loadingDiscordPermissions")}</Empty>;
  if (grants.error || roles.error) return <p role="alert" className="text-sm text-destructive">{grants.error?.message ?? roles.error?.message}<Button variant="secondary" className="ml-2" onClick={() => { void grants.refetch(); void roles.refetch(); }}>{t("retry")}</Button></p>;
  return <PermissionEditor key={JSON.stringify(grants.data?.items)} grants={grants.data?.items ?? []} roles={[...(roles.data?.roles ?? [])]} manage={manage} save={async items => { await competitiveApi.savePermissions(serverId, items); await Promise.all([grants.refetch(), refresh()]); }} />;
}

function PermissionEditor({ grants, roles, manage, save }: { grants: Grant[]; roles: { id: string; name: string; color?: number }[]; manage: boolean; save: (items: Grant[]) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [items, setItems] = useState(grants), [role, setRole] = useState(""), [permission, setPermission] = useState<Permission>("teams");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className="space-y-5"><div><h2 className="text-lg font-semibold">{t("discordRolePermissions")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("giveOrganizersSpecificActionsServerManagersRetainFullControl")}</p></div>
    {manage && <div className="flex flex-wrap items-end gap-3"><div className="min-w-56 flex-1"><Field label={t("discordRole")}><RoleCombobox roles={roles} value={role} onValueChange={setRole} disabled={busy} className="border-0 bg-muted/55 shadow-sm" /></Field></div><div className="min-w-44 flex-1"><Field label={t("permission")}><Choice value={permission} onChange={value => setPermission(value as Permission)} choices={permissionNames.map(value => ({ value, label: t(value) }))} /></Field></div><Button variant="secondary" disabled={busy || !role || items.some(item => item.roleId === role && item.permission === permission)} onClick={() => setItems(current => [...current, { roleId: role, permission }])}>{t("addPermission")}</Button></div>}
    {!items.length ? <Empty>{t("noDelegatedPermissionsServerManagersCanAdministerThisCompetitionWorkspace")}</Empty> : <div className="space-y-3">{items.map((item, index) => <div className={`${rowClass} flex items-center gap-3`} key={`${item.roleId}-${item.permission}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `#${(roles.find(role => role.id === item.roleId)?.color || 0x99aab5).toString(16).padStart(6, "0")}` }} /><span className="flex-1 text-sm font-medium">{roles.find(role => role.id === item.roleId)?.name ?? t("deletedRole")}</span><Pill>{t(item.permission)}</Pill>{manage && <Button variant="ghost" size="icon" disabled={busy} aria-label={t("removePermissionName", { permission: t(item.permission) })} onClick={() => setItems(current => current.filter((_, itemIndex) => index !== itemIndex))}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{manage && <Button disabled={busy || JSON.stringify(items) === JSON.stringify(grants)} onClick={async () => { setBusy(true); setError(""); try { await save(items); } catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotSavePermissions")); } finally { setBusy(false); } }}>{busy ? t("saving") : t("savePermissions")}</Button>}
  </div>;
}
