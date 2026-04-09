import { getTranslations } from "next-intl/server";
import GiveawaysClient from "./GiveawaysClient";

interface GiveawaysPageProps {
  params: Promise<{
    guildId: string;
    locale: string;
  }>;
}

export default async function GiveawaysPage({ params }: GiveawaysPageProps) {
  const { guildId, locale } = await params;
  const t = await getTranslations("GiveawaysPage");

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
