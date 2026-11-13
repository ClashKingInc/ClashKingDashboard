import Link from "@/components/app-link";
import { useLocale, useTranslations } from "use-intl";
import { publicPath, type PublicLocale } from "@/lib/locale-preference";
import { ClanSignalWordmark } from "./brand";
import { LandingLanguageSwitcher, type LandingTheme } from "./language-switcher";
import { LandingLanguageSuggestion } from "./language-suggestion";
import { LandingSessionAction } from "./session-action";
import "../../../../app/explorations/clan-signal-rally.css";

export function ClanSignalHeader({ landingTheme, onThemeChange }: {
  readonly landingTheme: LandingTheme;
  readonly onThemeChange?: (theme: LandingTheme) => void;
}) {
  const t = useTranslations("ClanSignal");
  const homePath = publicPath(useLocale() as PublicLocale, "/");
  return <div className="ck-home ck-public-header" data-cs-theme={landingTheme}>
      <header className="ck-nav-shell">
        <nav className="cs-nav ck-wrap" aria-label={t("navigation.ariaLabel")}>
          <Link href={homePath} aria-label={t("navigation.homeLabel")} className="cs-nav-brand">
            <ClanSignalWordmark priority />
          </Link>
          <div className="cs-nav-links">
            <Link href={`${homePath}#app`}>{t("navigation.mobileApp")}</Link>
            <Link href={`${homePath}#bot`}>{t("navigation.discordBot")}</Link>
            <Link href={`${homePath}#dashboard`}>{t("navigation.dashboard")}</Link>
          </div>
          <div className="cs-nav-actions">
            <LandingLanguageSwitcher
              label={t("language.label")}
              appearanceLabel={t("appearance.label")}
              dayLabel={t("appearance.day")}
              sunsetLabel={t("appearance.sunset")}
              initialTheme={landingTheme}
              onThemeChange={onThemeChange}
            />
            <LandingSessionAction loginLabel={t("actions.login")} dashboardLabel={t("actions.dashboard")} />
          </div>
        </nav>
      </header>
      <LandingLanguageSuggestion theme={landingTheme} />
  </div>;
}
