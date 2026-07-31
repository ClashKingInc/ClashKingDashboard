"use client";

import { useLocale, useTranslations } from "next-intl";
import GiveawaysClient from "./GiveawaysClient";
import { useGuildId } from "@/lib/dashboard-route";

export default function GiveawaysPage() {
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("GiveawaysPage");

  return (
    <GiveawaysClient
      guildId={guildId}
      locale={locale}
      title={t("title")}
      description={t("description")}
      statsLabels={{
        totalEntries: t("stats.totalEntries"),
        ongoing: t("stats.ongoing"),
        upcoming: t("stats.upcoming"),
        ended: t("stats.ended"),
      }}
      statsDescriptions={{
        totalEntries: t("statsDescriptions.totalEntries"),
        ongoing: t("statsDescriptions.ongoing"),
        upcoming: t("statsDescriptions.upcoming"),
        ended: t("statsDescriptions.ended"),
      }}
      listTitle={t("listTitle")}
      listDescription={t("listDescription")}
      tabs={{
        ongoing: t("tabs.ongoing"),
        upcoming: t("tabs.upcoming"),
        ended: t("tabs.ended"),
      }}
    />
  );
}
