"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

interface InactiveServerDialogProps {
  readonly guild: GuildInfo | null;
  readonly locale?: string;
  readonly onClose: () => void;
  readonly onReactivated: (guild: GuildInfo) => void;
}

export function InactiveServerDialog({ guild, locale, onClose, onReactivated }: InactiveServerDialogProps) {
  const t = useTranslations("ServersPage.inactive");
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      open={guild !== null}
      onOpenChange={(open) => {
        if (!open && !reactivating) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description")}
            <span className="mt-3 block text-foreground">
              {t("lastUsed", {
                date: guild?.last_command_at
                  ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(guild.last_command_at))
                  : t("unknown"),
              })}
            </span>
            {error && <span className="mt-3 block text-destructive">{error}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reactivating}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={reactivating}
            onClick={(event) => {
              event.preventDefault();
              void reactivate();
            }}
          >
            {reactivating ? t("reactivating") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
