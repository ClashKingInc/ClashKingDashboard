import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ClanSignalHeroModel } from "./clan-signal/hero-model";
import { ClanSignalWordmark } from "./clan-signal/brand";
import { ClanSignalFooter } from "./clan-signal/footer";
import { LandingLanguageSwitcher } from "./clan-signal/language-switcher";
import { RotatingHeadline } from "./clan-signal/rotating-headline";
import "../../../app/explorations/clan-signal.css";

const SHARED = "/concepts/local/assets";
const ICONS = `${SHARED}/bot/icons`;
const LANDING_THEME_COOKIE = "CK_LANDING_THEME";

type Feature = {
  icon: string;
  title: string;
  copy: string;
};

function FeatureIcon({ name, size = 30, alt = "" }: { name: string; size?: number; alt?: string }) {
  const aspectRatios: Record<string, number> = {
    "gear.png": 55 / 52,
    "shield.png": 112 / 128,
    "war_star.png": 56 / 54,
  };
  const dimensions = { width: size, height: Math.round(size * (aspectRatios[name] ?? 1)) };

  return <Image src={`${ICONS}/${name}`} alt={alt} {...dimensions} unoptimized />;
}

function ArrowAsset() {
  return (
    <Image
      src={`${SHARED}/icons/Icon_DC_ArrowRight.png`}
      alt=""
      width={12}
      height={17}
      className="cs-arrow"
      unoptimized
    />
  );
}

function FeatureList({ features }: { features: readonly Feature[] }) {
  return (
    <div className="cs-feature-list">
      {features.map((feature) => (
        <article key={feature.title}>
          <span className="cs-feature-icon"><FeatureIcon name={feature.icon} /></span>
          <div>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export async function ClanSignal() {
  const t = await getTranslations("ClanSignal");
  const cookieStore = await cookies();
  const landingTheme = cookieStore.get(LANDING_THEME_COOKIE)?.value === "sunset" ? "sunset" : "day";
  const headlinePhrases = [
    [t("hero.phrases.run.first"), t("hero.phrases.run.second"), t("hero.phrases.run.third")],
    [t("hero.phrases.accounts.first"), t("hero.phrases.accounts.second"), t("hero.phrases.accounts.third")],
    [t("hero.phrases.stats.first"), t("hero.phrases.stats.second"), t("hero.phrases.stats.third")],
  ] as const;
  const botFeatures = [
    { icon: "people.png", title: t("bot.features.rosters.title"), copy: t("bot.features.rosters.copy") },
    { icon: "war_star.png", title: t("bot.features.warTools.title"), copy: t("bot.features.warTools.copy") },
    { icon: "shield.png", title: t("bot.features.accounts.title"), copy: t("bot.features.accounts.copy") },
  ] as const;
  const appFeatures = [
    { icon: "war_star.png", title: t("app.features.widgets.title"), copy: t("app.features.widgets.copy") },
    { icon: "clock.png", title: t("app.features.notifications.title"), copy: t("app.features.notifications.copy") },
    { icon: "shield.png", title: t("app.features.accounts.title"), copy: t("app.features.accounts.copy") },
  ] as const;
  const dashboardFeatures = [
    { icon: "gear.png", title: t("dashboard.features.settings.title"), copy: t("dashboard.features.settings.copy") },
    { icon: "people.png", title: t("dashboard.features.rosters.title"), copy: t("dashboard.features.rosters.copy") },
    { icon: "clock.png", title: t("dashboard.features.automation.title"), copy: t("dashboard.features.automation.copy") },
  ] as const;

  return (
    <main className="clan-signal" data-cs-theme={landingTheme}>
      <header className="cs-nav-shell">
        <nav className="cs-nav" aria-label={t("navigation.ariaLabel")}>
          <Link href="/" aria-label={t("navigation.homeLabel")} className="cs-nav-brand">
            <ClanSignalWordmark priority />
          </Link>
          <div className="cs-nav-links">
            <a href="#app">{t("navigation.mobileApp")}</a>
            <a href="#bot">{t("navigation.discordBot")}</a>
            <a href="#dashboard">{t("navigation.dashboard")}</a>
          </div>
          <div className="cs-nav-actions">
            <LandingLanguageSwitcher
              label={t("language.label")}
              appearanceLabel={t("appearance.label")}
              dayLabel={t("appearance.day")}
              sunsetLabel={t("appearance.sunset")}
              initialTheme={landingTheme}
            />
            <a className="cs-button cs-button-small" href="https://invite.clashk.ing/" target="_blank" rel="noreferrer">
              {t("actions.addToDiscord")} <ArrowAsset />
            </a>
          </div>
        </nav>
      </header>

      <section className="cs-hero" aria-labelledby="cs-hero-title">
        <div className="cs-hero-copy cs-enter">
          <RotatingHeadline phrases={headlinePhrases} label={t("hero.rotatingLabel")} />
          <p>{t("hero.copy")}</p>
          <div className="cs-actions">
            <a className="cs-button" href="https://invite.clashk.ing/" target="_blank" rel="noreferrer">
              {t("actions.addClashKing")} <ArrowAsset />
            </a>
            <button className="cs-text-link cs-disabled" type="button" disabled>
              {t("actions.openDashboard")} <ArrowAsset />
            </button>
          </div>
        </div>
        <div className="cs-hero-visual cs-enter cs-enter-late">
          <ClanSignalHeroModel />
        </div>
      </section>

      <section className="cs-product-section cs-mobile" id="app" aria-labelledby="cs-app-title">
        <div className="cs-app-stage" aria-label={t("app.stageLabel")}>
          <Image
            src="/concepts/clan-signal/mobile-clan-overview.png"
            alt={t("app.images.clanOverview")}
            width={1206}
            height={2472}
            sizes="(max-width: 640px) 52vw, 260px"
            className="cs-app-screen cs-app-screen-clan"
            unoptimized
          />
          <Image
            src="/concepts/clan-signal/mobile-upgrade-stats.png"
            alt={t("app.images.upgradeStats")}
            width={1206}
            height={2472}
            sizes="(max-width: 640px) 48vw, 240px"
            className="cs-app-screen cs-app-screen-upgrade"
            unoptimized
          />
          <Image
            src="/concepts/clan-signal/war-widget-cutout.png"
            alt={t("app.images.warWidget")}
            width={1049}
            height={493}
            sizes="(max-width: 640px) 88vw, 430px"
            className="cs-app-war-widget"
            unoptimized
          />
        </div>
        <div className="cs-product-copy">
          <h2 id="cs-app-title">{t("app.title")}</h2>
          <p className="cs-section-intro">{t("app.intro")}</p>
          <FeatureList features={appFeatures} />
          <div className="cs-actions">
            <a className="cs-button" href="https://testflight.apple.com/join/6Q8dfnMX" target="_blank" rel="noreferrer">{t("actions.joinTestFlight")} <ArrowAsset /></a>
            <a className="cs-text-link" href="https://play.google.com/store/apps/details?id=com.clashking.clashkingapp" target="_blank" rel="noreferrer">{t("actions.getAndroidApp")} <ArrowAsset /></a>
          </div>
        </div>
      </section>

      <section className="cs-app cs-bot" id="bot" aria-labelledby="cs-bot-title">
        <div className="cs-product-copy">
          <h2 id="cs-bot-title">{t("bot.title")}</h2>
          <p className="cs-section-intro">{t("bot.intro")}</p>
          <FeatureList features={botFeatures} />
          <a className="cs-text-link" href="https://invite.clashk.ing/" target="_blank" rel="noreferrer">{t("actions.addToDiscord")} <ArrowAsset /></a>
        </div>
        <figure className="cs-bot-art" aria-label={t("bot.imageLabel")}>
          <Image
            src="/concepts/clan-signal/discord-clan-command.png"
            alt={t("bot.imageAlt")}
            width={611}
            height={765}
            className="cs-discord-preview"
            unoptimized
          />
        </figure>
      </section>

      <section className="cs-product-section cs-dashboard" id="dashboard" aria-labelledby="cs-dashboard-title">
        <div className="cs-product-copy">
          <h2 id="cs-dashboard-title">{t("dashboard.title")}</h2>
          <p className="cs-section-intro">{t("dashboard.intro")}</p>
          <FeatureList features={dashboardFeatures} />
          <button className="cs-text-link cs-disabled" type="button" disabled>
            {t("actions.openDashboard")} <ArrowAsset />
          </button>
        </div>
        <figure className="cs-dashboard-art" aria-label={t("dashboard.imageLabel")}>
          <Image
            src="/concepts/clan-signal/builder-hut-level-8.png"
            alt={t("dashboard.imageAlt")}
            width={1024}
            height={1024}
            sizes="(max-width: 640px) calc(100vw - 40px), 520px"
            unoptimized
          />
        </figure>
      </section>

      <section className="cs-resources" id="developers" aria-labelledby="cs-resources-title">
        <div>
          <h2 id="cs-resources-title">{t("resources.title")}</h2>
          <p>{t("resources.copy")}</p>
        </div>
        <nav aria-label={t("resources.ariaLabel")}>
          <a href="https://docs.clashk.ing/" target="_blank" rel="noreferrer">{t("resources.documentation")} <ArrowAsset /></a>
          <a href="https://github.com/ClashKingInc" target="_blank" rel="noreferrer">GitHub <ArrowAsset /></a>
          <a href="https://go.api.clashk.ing/" target="_blank" rel="noreferrer">{t("resources.publicApi")} <ArrowAsset /></a>
        </nav>
      </section>

      <ClanSignalFooter />
    </main>
  );
}
