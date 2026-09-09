"use client";

import Link from "@/components/app-link";
import { ClanSignalPageShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "use-intl";

const REPOSITORY_URLS = {
  bot: "https://github.com/ClashKingInc/ClashKingBot",
  app: "https://github.com/ClashKingInc/ClashKingApp",
  api: "https://github.com/ClashKingInc/ClashKingAPI",
  assets: "https://github.com/ClashKingInc/ClashKingAssets",
} as const;

export default function OpenSourcePage() {
  const t = useTranslations("OpenSourcePage");

  return (
    <ClanSignalPageShell title={t("title")} eyebrow="ClashKing" description={t("subtitle")} contentClassName="cs-info-document">
      <div className="cs-info-grid">
        <section className="cs-info-panel">
          <h2>{t("github.title")}</h2>
          <p>{t("github.description")}</p>
          <div className="cs-info-actions">
            <Link className="cs-button" href="https://github.com/ClashKingInc/" target="_blank" rel="noopener noreferrer">
              {t("github.ctaPrimary")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="cs-info-repos">
            {Object.entries(REPOSITORY_URLS).map(([repository, href]) => (
              <Link key={repository} href={href} target="_blank" rel="noopener noreferrer">
                {t(`github.repos.${repository}`)}
              </Link>
            ))}
          </div>
        </section>
        <section className="cs-info-panel cs-info-panel-muted">
          <h2>{t("api.title")}</h2>
          <p>{t("api.description")}</p>
          <div className="cs-info-actions">
            <Link className="cs-button" href="https://api.clashk.ing/" target="_blank" rel="noopener noreferrer">
              {t("api.cta")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="cs-info-panel cs-info-panel-muted md:col-span-2">
          <h2>{t("translation.title")}</h2>
          <p>{t("translation.description")}</p>
          <div className="cs-info-actions">
            <Link className="cs-info-secondary" href="https://crowdin.com/project/clashkingapp" target="_blank" rel="noopener noreferrer">
              {t("translation.app")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
            <Link className="cs-info-secondary" href="https://crowdin.com/project/clashkingbot" target="_blank" rel="noopener noreferrer">
              {t("translation.bot")} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </ClanSignalPageShell>
  );
}
