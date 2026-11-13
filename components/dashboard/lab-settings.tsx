"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import { dashboardHref } from "@/lib/dashboard-route";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";

export function LabSettings({ serverId, canManage }: { readonly serverId: string; readonly canManage: boolean }) {
  const t = useTranslations("AccountSettings.lab");
  const general = useTranslations("GeneralPage.tenureRoles");
  const generalPage = useTranslations("GeneralPage");
  const common = useTranslations("Common");
  const queryClient = useQueryClient();
  const settings = useQuery({ ...dashboardQueryOptions.settings(serverId), enabled: Boolean(serverId) });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  async function setTenure(enabled: boolean) {
    if (saving || !canManage) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await apiClient.servers.updateSettings(serverId, { lab_tenure_roles_enabled: enabled });
      if (result.error || !result.data) throw new Error(result.error ?? common("error"));
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings(serverId), exact: true });
      setNotice({ error: false, text: generalPage("settingsSaved") });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : common("error") });
    } finally {
      setSaving(false);
    }
  }

  if (settings.isPending) return <Skeleton className="h-48 rounded-3xl" />;
  if (settings.isError || !settings.data) return <div role="alert" className="space-y-3 text-sm text-destructive"><p>{common("loadError")}</p><Button variant="secondary" onClick={() => void settings.refetch()}>{common("retry")}</Button></div>;
  const enabled = settings.data.lab_tenure_roles_enabled;
  return <section className="space-y-4" aria-labelledby="lab-title">
    <div><h2 id="lab-title" className="text-lg font-semibold">{t("title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("description")}</p></div>
    <div className="rounded-3xl bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h3 id="tenure-experiment-label" className="font-semibold">{general("title")}</h3>
          <p id="tenure-experiment-description" className="text-sm leading-relaxed text-muted-foreground">{general("description")} {t("tenureBehavior")}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("tenureRequirements")}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("tenureDisable")}</p>
        </div>
        <Switch aria-labelledby="tenure-experiment-label" aria-describedby="tenure-experiment-description" checked={enabled} disabled={!canManage || saving} onCheckedChange={(value) => void setTenure(value)} />
      </div>
      <div className="mt-4 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
        {enabled && <Link className="text-sm font-medium text-primary underline underline-offset-4" href={dashboardHref("general", serverId)}>{generalPage("title")}</Link>}
        {!canManage && <span className="text-sm text-muted-foreground">{t("readOnly")}</span>}
        <span role="status" aria-live="polite" className={notice?.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{saving ? generalPage("saving") : notice?.text}</span>
      </div>
    </div>
  </section>;
}
