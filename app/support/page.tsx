"use client";

import { ClanSignalPageShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import { SupportContent } from "@/components/support/support-content";
import { useTranslations } from "use-intl";

export default function SupportPage() {
  const t = useTranslations("SupportPage");

  return (
    <ClanSignalPageShell
      title={t("title")}
      eyebrow="ClashKing"
      description={t("subtitle")}
      contentClassName="cs-info-document"
    >
      <SupportContent showHeader={false} />
    </ClanSignalPageShell>
  );
}
