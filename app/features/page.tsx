"use client";

import Link from "@/components/app-link";
import { ClanSignalPageShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "use-intl";

export default function FeaturesPage() {
  const t = useTranslations("FeaturesPage");
  const features = [
    {
      id: "bot",
      title: t("sections.bot.title"),
      description: t("sections.bot.description"),
      items: (t.raw("sections.bot.items") as string[]) ?? [],
      primary: { label: t("sections.bot.ctaPrimary"), href: "https://invite.clashk.ing/" },
      secondary: { label: t("sections.bot.ctaSecondary"), href: "https://discord.clashk.ing/" },
    },
    {
      id: "app",
      title: t("sections.app.title"),
      description: t("sections.app.description"),
      items: (t.raw("sections.app.items") as string[]) ?? [],
      primary: { label: t("sections.app.ctaPrimary"), href: "https://play.google.com/apps/testing/com.clashking.clashkingapp" },
      secondary: { label: t("sections.app.ctaSecondary"), href: "https://testflight.apple.com/join/6Q8dfnMX" },
    },
    {
      id: "api",
      title: t("sections.api.title"),
      description: t("sections.api.description"),
      items: (t.raw("sections.api.items") as string[]) ?? [],
      primary: { label: t("sections.api.ctaPrimary"), href: "https://api.clashk.ing/" },
      secondary: { label: t("sections.api.ctaSecondary"), href: "https://github.com/ClashKingInc/ClashKingAPI" },
    },
  ];

  return (
    <ClanSignalPageShell title={t("hero.title")} eyebrow="ClashKing" description={t("hero.subtitle")} contentClassName="cs-info-document">
      <div className="cs-info-stack">
        {features.map((feature, index) => (
          <section key={feature.id} className={`cs-info-panel ${index % 2 === 1 ? "cs-info-panel-muted" : ""}`}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
            {feature.items.length > 0 && (
              <ul className="cs-info-list">
                {feature.items.map((item) => (
                  <li key={item}><CheckCircle2 aria-hidden="true" /><span>{item}</span></li>
                ))}
              </ul>
            )}
            <div className="cs-info-actions">
              <Link className="cs-button" href={feature.primary.href} target="_blank" rel="noopener noreferrer">{feature.primary.label}</Link>
              <Link className="cs-info-secondary" href={feature.secondary.href} target="_blank" rel="noopener noreferrer">{feature.secondary.label}</Link>
            </div>
          </section>
        ))}
      </div>
    </ClanSignalPageShell>
  );
}
