import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ClanSignalWordmark } from "./brand";
import { ClanSignalFooter } from "./footer";
import { LandingLanguageSwitcher } from "./language-switcher";
import "../../../../app/explorations/clan-signal.css";

const LANDING_THEME_COOKIE = "CK_LANDING_THEME";
const ARROW_ICON = "/concepts/local/assets/icons/Icon_DC_ArrowRight.png";

export async function ClanSignalLegalShell({
  title,
  eyebrow,
  children,
}: Readonly<{
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}>) {
  const t = await getTranslations("ClanSignal");
  const cookieStore = await cookies();
  const landingTheme = cookieStore.get(LANDING_THEME_COOKIE)?.value === "sunset" ? "sunset" : "day";

  return (
    <main className="clan-signal cs-legal-page" data-cs-theme={landingTheme}>
      <header className="cs-nav-shell">
        <nav className="cs-nav" aria-label={t("navigation.ariaLabel")}>
          <Link href="/" aria-label={t("navigation.homeLabel")} className="cs-nav-brand">
            <ClanSignalWordmark priority />
          </Link>
          <div className="cs-nav-links">
            <Link href="/#app">{t("navigation.mobileApp")}</Link>
            <Link href="/#bot">{t("navigation.discordBot")}</Link>
            <Link href="/#dashboard">{t("navigation.dashboard")}</Link>
          </div>
          <div className="cs-nav-actions">
            <LandingLanguageSwitcher
              label={t("settings.label")}
              languageLabel={t("language.label")}
              appearanceLabel={t("appearance.label")}
              systemLanguageLabel={t("language.system")}
              systemAppearanceLabel={t("appearance.system")}
              dayLabel={t("appearance.day")}
              sunsetLabel={t("appearance.sunset")}
              initialTheme={landingTheme}
            />
            <a className="cs-button cs-button-small" href="https://invite.clashk.ing/" target="_blank" rel="noreferrer">
              {t("actions.addToDiscord")}
              <Image src={ARROW_ICON} alt="" width={12} height={17} className="cs-arrow" unoptimized />
            </a>
          </div>
        </nav>
      </header>

      <section className="cs-legal-hero">
        <div>
          <p className="cs-legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </section>

      <article className="cs-legal-document">{children}</article>
      <ClanSignalFooter />
    </main>
  );
}
