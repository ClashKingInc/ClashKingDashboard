"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardAccessConfig, DashboardAccessGrant, DashboardAccessLevel, DashboardSection } from "@/lib/api/types/dashboard-access";

const sectionMessageKeys: Record<DashboardSection, string> = {
  settings: "general.name",
  family_settings: "familySettings.name",
  logs: "logs.name",
  clans: "clans.name",
  rosters: "rosters.name",
  links: "links.name",
  moderation: "bans.name",
  roles: "roles.name",
  reminders: "reminders.name",
  autoboards: "autoboards.name",
  giveaways: "giveaways.name",
  panels: "panels.name",
  tickets: "tickets.name",
  embeds: "embeds.name",
  wars: "wars.name",
  leaderboards: "leaderboards.name",
};

export function DashboardAccessSettings({ guildId }: { guildId: string }) {
  const t = useTranslations("GeneralPage.security.dashboardAccess");
  const tSidebar = useTranslations("Sidebar");
  const [config, setConfig] = useState<DashboardAccessConfig | null>(null);
  const [grants, setGrants] = useState<DashboardAccessGrant[]>([]);
  const [roleToAdd, setRoleToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [retryToken, setRetryToken] = useState(0);
  const savedFingerprint = useRef("");
  const currentFingerprint = useRef("");
  const saveQueue = useRef(Promise.resolve());

  const load = useCallback(async () => {
    const response = await apiClient.servers.getDashboardAccess(guildId);
    if (response.error || !response.data) {
      setError(response.error ?? t("loadError"));
      return;
    }
    setConfig(response.data);
    setGrants(response.data.grants);
    savedFingerprint.current = serializeDashboardAccessGrants(response.data.grants);
    setSaveStatus("idle");
  }, [guildId, t]);

  useEffect(() => { void load(); }, [load]);

  const selectedRoleIds = useMemo(() => [...new Set(grants.map((grant) => grant.role_id))], [grants]);
  const availableRoles = config?.roles.filter((role) => !selectedRoleIds.includes(role.id)) ?? [];
  const visibleSections = config?.sections.filter((section) => section !== "wars" && section !== "leaderboards" && section !== "panels") ?? [];
  const fingerprint = useMemo(() => serializeDashboardAccessGrants(grants), [grants]);

  useEffect(() => {
    currentFingerprint.current = fingerprint;
  }, [fingerprint]);

  useEffect(() => {
    if (!config || fingerprint === savedFingerprint.current) return;
    const snapshot = grants;
    const snapshotFingerprint = fingerprint;
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (snapshotFingerprint !== currentFingerprint.current) return;
        setSaveStatus("saving");
        setError(null);
        const response = await apiClient.servers.updateDashboardAccess(guildId, snapshot);
        if (response.error) {
          if (snapshotFingerprint === currentFingerprint.current) {
            setError(response.error);
            setSaveStatus("error");
          }
          return;
        }
        savedFingerprint.current = snapshotFingerprint;
        if (snapshotFingerprint === currentFingerprint.current) setSaveStatus("saved");
      });
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [config, fingerprint, grants, guildId, retryToken]);

  const updateGrants = (updater: (current: DashboardAccessGrant[]) => DashboardAccessGrant[]) => {
    setError(null);
    setSaveStatus("pending");
    setGrants(updater);
  };

  const setGrant = (roleId: string, section: DashboardSection, value: "none" | DashboardAccessLevel) => {
    updateGrants((current) => {
      const remaining = current.filter((grant) => !(grant.role_id === roleId && grant.section === section));
      return value === "none" ? remaining : [...remaining, { role_id: roleId, section, access_level: value }];
    });
  };

  const addRole = () => {
    if (!roleToAdd || !config) return;
    updateGrants((current) => [...current, { role_id: roleToAdd, section: "settings", access_level: "view" }]);
    setRoleToAdd("");
  };

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 lg:min-h-[4.5rem]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <SaveStatus status={saveStatus} />
      </div>

      {error && <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-3"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => { setSaveStatus("pending"); setRetryToken((value) => value + 1); }}>{t("retry")}</Button></AlertDescription></Alert>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={roleToAdd} onValueChange={setRoleToAdd} disabled={!config}>
          <SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5 sm:max-w-sm"><SelectValue placeholder={t("selectRole")} /></SelectTrigger>
          <SelectContent>{availableRoles.map((role) => <SelectItem key={role.id} value={role.id}><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99AAB5" }} />{role.name}</span></SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={addRole} disabled={!roleToAdd}><Plus className="mr-2 h-4 w-4" />{t("addRole")}</Button>
      </div>

      {!config ? (
        <div className="space-y-3"><Skeleton className="h-28 rounded-[20px]" /><Skeleton className="h-28 rounded-[20px]" /></div>
      ) : selectedRoleIds.length === 0 ? (
        <div className="rounded-[20px] bg-muted/35 px-4 py-6 text-center text-sm text-muted-foreground">{t("empty")}</div>
      ) : selectedRoleIds.map((roleId) => {
        const role = config.roles.find((candidate) => candidate.id === roleId);
        if (!role) return null;
        return <div key={roleId} className="rounded-[20px] bg-card p-4 shadow-sm shadow-black/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99AAB5" }} /><span className="truncate">{role.name}</span></div>
            <Button variant="ghost" size="icon" onClick={() => updateGrants((current) => current.filter((grant) => grant.role_id !== roleId))} aria-label={t("removeRole", { role: role.name })}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visibleSections.map((section) => {
            const value = grants.find((grant) => grant.role_id === roleId && grant.section === section)?.access_level ?? "none";
            return <label key={section} className="space-y-1.5 text-xs font-medium"><span>{tSidebar(sectionMessageKeys[section])}</span><Select value={value} onValueChange={(next) => setGrant(roleId, section, next as "none" | DashboardAccessLevel)}><SelectTrigger className="h-9 border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("levels.none")}</SelectItem><SelectItem value="view">{t("levels.view")}</SelectItem><SelectItem value="manage">{t("levels.manage")}</SelectItem></SelectContent></Select></label>;
          })}</div>
        </div>;
      })}
    </section>
  );
}

export function serializeDashboardAccessGrants(grants: DashboardAccessGrant[]) {
  return JSON.stringify([...grants].sort((left, right) => `${left.role_id}:${left.section}`.localeCompare(`${right.role_id}:${right.section}`)));
}

function SaveStatus({ status }: { status: "idle" | "pending" | "saving" | "saved" | "error" }) {
  const t = useTranslations("GeneralPage.security.dashboardAccess.status");
  if (status === "saving") return <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("saving")}</span>;
  if (status === "saved") return <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-emerald-500"><Check className="h-3.5 w-3.5" />{t("saved")}</span>;
  if (status === "pending") return <span className="shrink-0 text-xs text-muted-foreground">{t("pending")}</span>;
  if (status === "error") return <span className="shrink-0 text-xs text-destructive">{t("error")}</span>;
  return null;
}
