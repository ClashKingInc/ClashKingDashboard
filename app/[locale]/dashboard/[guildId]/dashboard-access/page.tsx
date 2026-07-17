"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Check, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardAccessConfig, DashboardAccessGrant, DashboardAccessLevel, DashboardSection } from "@/lib/api/types/dashboard-access";

const sectionLabels: Record<DashboardSection, string> = {
  settings: "General settings", family_settings: "Family settings", logs: "Logs", clans: "Clans",
  rosters: "Rosters", links: "Links", moderation: "Moderation", roles: "Roles", reminders: "Reminders",
  autoboards: "Autoboards", giveaways: "Giveaways", panels: "Panels", tickets: "Tickets", embeds: "Embeds",
  wars: "Wars", leaderboards: "Leaderboards",
};

export default function DashboardAccessPage() {
  const { guildId } = useParams<{ guildId: string }>();
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
      setError(response.error ?? "Could not load dashboard access");
      return;
    }
    setConfig(response.data);
    setGrants(response.data.grants);
    savedFingerprint.current = serializeGrants(response.data.grants);
    setSaveStatus("idle");
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  const selectedRoleIds = useMemo(() => [...new Set(grants.map((grant) => grant.role_id))], [grants]);
  const availableRoles = config?.roles.filter((role) => !selectedRoleIds.includes(role.id)) ?? [];
  const fingerprint = useMemo(() => serializeGrants(grants), [grants]);

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
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-primary/25 bg-primary/10 p-3"><KeyRound className="h-7 w-7 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Dashboard access</h1><p className="mt-1 text-sm text-muted-foreground">Give Discord roles view or management access to specific sections. Multiple roles combine.</p></div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-3"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => { setSaveStatus("pending"); setRetryToken((value) => value + 1); }}>Retry</Button></AlertDescription></Alert>}

      <Card>
        <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Role grants</CardTitle><CardDescription>Discord-managed roles, bot roles, and @everyone are intentionally unavailable.</CardDescription></div><SaveStatus status={saveStatus} /></div></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={roleToAdd} onValueChange={setRoleToAdd}><SelectTrigger className="sm:max-w-sm"><SelectValue placeholder="Select a Discord role" /></SelectTrigger><SelectContent>{availableRoles.map((role) => <SelectItem key={role.id} value={role.id}><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99AAB5" }} />{role.name}</span></SelectItem>)}</SelectContent></Select>
            <Button onClick={addRole} disabled={!roleToAdd}><Plus className="mr-2 h-4 w-4" />Add role</Button>
          </div>

          {selectedRoleIds.map((roleId) => {
            const role = config?.roles.find((candidate) => candidate.id === roleId);
            if (!role) return null;
            return <div key={roleId} className="rounded-xl border bg-muted/15 p-4">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" style={{ color: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined }} />{role.name}</div><Button variant="ghost" size="icon" onClick={() => updateGrants((current) => current.filter((grant) => grant.role_id !== roleId))} aria-label={`Remove ${role.name}`}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{config?.sections.map((section) => {
                const value = grants.find((grant) => grant.role_id === roleId && grant.section === section)?.access_level ?? "none";
                return <label key={section} className="space-y-1.5 text-xs font-medium"><span>{sectionLabels[section]}</span><Select value={value} onValueChange={(next) => setGrant(roleId, section, next as "none" | DashboardAccessLevel)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No access</SelectItem><SelectItem value="view">View</SelectItem><SelectItem value="manage">Manage</SelectItem></SelectContent></Select></label>;
              })}</div>
            </div>;
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function serializeGrants(grants: DashboardAccessGrant[]) {
  return JSON.stringify([...grants].sort((left, right) => `${left.role_id}:${left.section}`.localeCompare(`${right.role_id}:${right.section}`)));
}

function SaveStatus({ status }: { status: "idle" | "pending" | "saving" | "saved" | "error" }) {
  if (status === "saving") return <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving</span>;
  if (status === "saved") return <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-emerald-500"><Check className="h-3.5 w-3.5" />Saved</span>;
  if (status === "pending") return <span className="shrink-0 text-xs text-muted-foreground">Pending changes</span>;
  if (status === "error") return <span className="shrink-0 text-xs text-destructive">Not saved</span>;
  return <span className="shrink-0 text-xs text-muted-foreground">Saves automatically</span>;
}
