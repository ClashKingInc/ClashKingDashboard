"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api/client";
import type { GuildInfo } from "@/lib/api/types/server";
import { requiresServerReactivation } from "@/lib/server-activity";

interface InactiveServerDialogProps {
  readonly guild: GuildInfo | null;
  readonly locale?: string;
  readonly onClose: () => void;
  readonly onReactivated: (guild: GuildInfo) => void;
}

export function InactiveServerDialog({ guild, locale, onClose, onReactivated }: InactiveServerDialogProps) {
  const t = useTranslations("ServersPage");
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstActivation = guild !== null && !guild.last_command_at;
  let actionLabel = t("inactive.confirm");
  if (firstActivation) actionLabel = t("configure");
  if (reactivating) actionLabel = t("inactive.reactivating");

  useEffect(() => {
    setError(null);
  }, [guild]);

  const reactivate = async () => {
    if (!guild) return;

    setReactivating(true);
    setError(null);
    const response = await apiClient.servers.reactivateServer(guild.id);
    setReactivating(false);
    if (response.error) {
      setError(response.error);
      return;
    }

    onReactivated({
      ...guild,
      inactive: false,
      last_command_at: new Date().toISOString(),
    });
  };

  return (
    <AlertDialog
      open={guild !== null && requiresServerReactivation(guild)}
      onOpenChange={(open) => {
        if (!open && !reactivating) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{firstActivation ? t("configure") : t("inactive.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {firstActivation ? t("inactive.unknown") : t("inactive.description")}
            {guild?.last_command_at && (
              <span className="mt-3 block text-foreground">
                {t("inactive.lastUsed", {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(guild.last_command_at)),
                })}
              </span>
            )}
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reactivating}>{t("inactive.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={reactivating}
            onClick={(event) => {
              event.preventDefault();
              void reactivate();
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
