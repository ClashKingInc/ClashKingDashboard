"use client";

import Link from "@/components/app-link";
import { ClanSignalPageShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "use-intl";

export default function HelpPage() {
  const t = useTranslations("HelpPage");

  return (
    <ClanSignalPageShell title={t("title")} eyebrow="ClashKing" description={t("subtitle")} contentClassName="cs-info-document">
      <div className="cs-info-grid">
        <section className="cs-info-panel">
          <h2>{t("documentation.title")}</h2>
          <p>{t("documentation.description")}</p>
          <div className="cs-info-actions">
            <Link className="cs-button" href="https://docs.clashk.ing/" target="_blank" rel="noopener noreferrer">
              {t("documentation.cta")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="cs-info-panel cs-info-panel-muted">
          <h2>{t("discord.title")}</h2>
          <p>{t("discord.description")}</p>
          <div className="cs-info-actions">
            <Link className="cs-button" href="https://discord.clashk.ing/" target="_blank" rel="noopener noreferrer">
              {t("discord.cta")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </ClanSignalPageShell>
  );
}
