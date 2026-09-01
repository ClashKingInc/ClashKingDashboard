"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Unplug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import type { ConnectedAppGrantListItem } from "@/lib/api/types/connected-apps";

export function ConnectedAppsSettings() {
  const t = useTranslations("ConnectedApps.settings");
  const loadErrorMessage = t("loadError");
  const locale = useLocale();
  const [items, setItems] = useState<ConnectedAppGrantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await apiClient.connectedApps.listGrants();
    if (response.error || !response.data) {
      setError(response.error ?? loadErrorMessage);
    } else {
      setItems(response.data.items);
    }
    setLoading(false);
  }, [loadErrorMessage]);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (item: ConnectedAppGrantListItem) => {
    setRevokingId(item.application.id);
    setError(null);
    const response = await apiClient.connectedApps.revokeGrant(item.application.id);
    if (response.error) {
      setError(response.error);
    } else {
      setItems((current) => current.filter((entry) => entry.application.id !== item.application.id));
    }
    setRevokingId(null);
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="connected-apps-title">
      <div>
        <h2 id="connected-apps-title" className="text-lg font-semibold">{t("title")}</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>

      {error && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>{t("retry")}</Button>
        </div>
      )}

      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-muted/45 p-5 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.application.id} className="flex flex-col gap-4 rounded-2xl bg-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.application.name}</p>
                {item.application.developer_name && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {t("byDeveloper", { developer: item.application.developer_name })}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-background/80 px-2.5 py-1">
                    {item.grant.access_mode === "all_current_and_future"
                      ? t("dynamicAccess")
                      : t("selectedAccess", { count: item.grant.selected_player_tags.length })}
                  </span>
                  <span>
                    {t("connectedOn", {
                      date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.grant.connected_at)),
                    })}
                  </span>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={revokingId !== null}>
                    {revokingId === item.application.id
                      ? <Loader2 className="animate-spin" aria-hidden="true" />
                      : <Unplug aria-hidden="true" />}
                    {t("revoke")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirmTitle", { application: item.application.name })}</AlertDialogTitle>
                    <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void revoke(item)}>{t("confirmRevoke")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
