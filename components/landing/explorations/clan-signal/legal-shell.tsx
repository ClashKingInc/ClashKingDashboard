import Link from "@/components/app-link";
import { useTranslations } from "use-intl";
import { ClanSignalWordmark } from "./brand";
import { ClanSignalFooter } from "./footer";
import { LandingLanguageSwitcher } from "./language-switcher";
import { publicPath, type PublicLocale } from "@/lib/locale-preference";
import "../../../../app/explorations/clan-signal.css";


export function ClanSignalPageShell({
  title,
  eyebrow,
  description,
  contentClassName,
  locale = "en",
  children,
}: Readonly<{
  title: string;
  eyebrow: string;
  description?: string;
  contentClassName: string;
  locale?: PublicLocale;
  children: React.ReactNode;
}>) {
  const t = useTranslations("ClanSignal");
  const landingTheme = "day";

  return (
    <main className="clan-signal cs-legal-page" data-cs-theme={landingTheme}>
      <header className="cs-nav-shell">
        <nav className="cs-nav" aria-label={t("navigation.ariaLabel")}>
          <Link href={publicPath(locale, "/")} aria-label={t("navigation.homeLabel")} className="cs-nav-brand">
            <ClanSignalWordmark priority />
          </Link>
          <div className="cs-nav-links">
            <Link href={`${publicPath(locale, "/")}#app`}>{t("navigation.mobileApp")}</Link>
            <Link href={`${publicPath(locale, "/")}#bot`}>{t("navigation.discordBot")}</Link>
            <Link href={`${publicPath(locale, "/")}#dashboard`}>{t("navigation.dashboard")}</Link>
          </div>
          <div className="cs-nav-actions">
            <LandingLanguageSwitcher
              label={t("language.label")}
              appearanceLabel={t("appearance.label")}
              dayLabel={t("appearance.day")}
              sunsetLabel={t("appearance.sunset")}
              initialTheme={landingTheme}
            />
          </div>
        </nav>
      </header>

      <section className="cs-legal-hero">
        <div>
          <p className="cs-legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="cs-page-description">{description}</p>}
        </div>
      </section>

      <article className={contentClassName}>{children}</article>
      <ClanSignalFooter />
    </main>
  );
}

export function ClanSignalLegalShell(
  props: Readonly<{
    title: string;
    eyebrow: string;
    locale?: PublicLocale;
    children: React.ReactNode;
  }>,
) {
  return <ClanSignalPageShell {...props} contentClassName="cs-legal-document" />;
}
