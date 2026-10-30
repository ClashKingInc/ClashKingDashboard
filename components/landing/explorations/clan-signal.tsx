"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Code2, ArrowUpRight } from "lucide-react";
import Image from "@/components/app-image";
import Link from "@/components/app-link";
import { useLocale, useTranslations } from "use-intl";
import { ClanSignalHeroModel } from "./clan-signal/hero-model";
import { ClanSignalWordmark } from "./clan-signal/brand";
import { ClanSignalFooter } from "./clan-signal/footer";
import { LandingLanguageSwitcher } from "./clan-signal/language-switcher";
import { RotatingHeadline, SectionTitle, Scribble } from "./clan-signal/rotating-headline";
import { LandingSessionAction } from "./clan-signal/session-action";
import { HeroActions, PlatformMark } from "./clan-signal/hero-actions";
import { LandingCounts } from "./clan-signal/counts";
import { useLandingMotion } from "./clan-signal/motion";
import { readLandingTheme } from "./clan-signal/language-switcher";
import { isPublicLocale, publicPath, type SupportedLocale } from "@/lib/locale-preference";
import "../../../app/explorations/clan-signal.css";
import "../../../app/explorations/clan-signal-rally.css";

const SHARED = "/concepts/local/assets";
const ICONS = `${SHARED}/bot/icons`;

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

export function ClanSignal() {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("ClanSignal");
  const [landingTheme, setLandingTheme] = useState(readLandingTheme);
  const motion = useLandingMotion();
  const rootRef = useRef<HTMLElement>(null);
  const homePath = isPublicLocale(locale) ? publicPath(locale, "/") : "/";
  const headlinePhrases = ['clan', 'stats', 'game'].map(key => [t(`rally.${key}.first`), t(`rally.${key}.prefix`), t(`rally.${key}.word`)]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const headings = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-drawn'); headings.unobserve(entry.target); }
    }), { threshold: .7 });
    root.querySelectorAll('.section-scribble').forEach(element => headings.observe(element));
    const fitTitles = () => root.querySelectorAll<HTMLElement>('.cs-mobile h2, .cs-bot h2').forEach(heading => {
      heading.style.fontSize = '';
      if (heading.scrollWidth > heading.clientWidth) heading.style.fontSize = `${parseFloat(getComputedStyle(heading).fontSize) * heading.clientWidth / heading.scrollWidth}px`;
    });
    fitTitles(); void document.fonts.ready.then(fitTitles);
    window.addEventListener('resize', fitTitles);
    if (!motion.enabled) root.getAnimations({ subtree: true }).forEach(animation => {
      if (animation.effect?.getComputedTiming().endTime !== Infinity) animation.finish();
    });
    const stage = root.querySelector<HTMLElement>('.cs-app-stage');
    const clan = stage?.querySelector<HTMLElement>('.cs-app-screen-clan');
    const upgrade = stage?.querySelector<HTMLElement>('.cs-app-screen-upgrade');
    const widget = stage?.querySelector<HTMLElement>('.cs-app-war-widget');
    let frame = 0;
    const move = () => {
      frame = 0;
      if (!stage || !clan || !upgrade || !widget) return;
      if (!motion.canMove()) { clan.style.transform = 'rotate(-2deg)'; upgrade.style.transform = 'rotate(3deg)'; widget.style.transform = 'translateX(-50%)'; return; }
      const bounds = stage.getBoundingClientRect();
      if (bounds.top > innerHeight || bounds.bottom < 0) return;
      const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
      clan.style.transform = `translate3d(${-10*progress}px,${24-48*progress}px,0) rotate(${-4+3*progress}deg)`;
      upgrade.style.transform = `translate3d(${14*progress}px,${40-70*progress}px,0) rotate(${5-3*progress}deg)`;
      widget.style.transform = `translate3d(-50%,${40-55*progress}px,0)`;
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(move); };
    window.addEventListener('scroll', queue, { passive: true }); window.addEventListener('resize', queue); queue();
    return () => { headings.disconnect(); window.removeEventListener('resize', fitTitles); cancelAnimationFrame(frame); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); };
  }, [motion.canMove, motion.enabled, locale]);
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
    <main ref={rootRef} className="clan-signal ck-home" data-cs-theme={landingTheme} data-motion={motion.enabled ? "enabled" : "paused"}>
      <div className="ck-sky">
      <header className="ck-nav-shell">
        <nav className="cs-nav ck-wrap" aria-label={t("navigation.ariaLabel")}>
          <Link href={homePath} aria-label={t("navigation.homeLabel")} className="cs-nav-brand">
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
              onThemeChange={setLandingTheme}
            />
            <LandingSessionAction loginLabel={t("actions.login")} dashboardLabel={t("actions.dashboard")} />
          </div>
        </nav>
      </header>

      <section className="ck-hero ck-wrap" aria-label={t('rally.label')}>
        <div className="ck-hero-copy">
          <RotatingHeadline phrases={headlinePhrases} label={t('rally.label')} canMove={motion.canMove} />
          <p>{t('rally.copy')}</p>
          <HeroActions mobileAppLabel={t('rally.getApp')} discordLabel={t('actions.addToDiscord')} />
        </div>
        <ClanSignalHeroModel canMove={motion.canMove} />
      </section>
      <LandingCounts canMove={motion.canMove} />
      </div>

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
          <h2 id="cs-app-title"><SectionTitle text={t("app.title")} /></h2>
          <p className="cs-section-intro">{t("app.intro")}</p>
          <FeatureList features={appFeatures} />
          <div className="cs-actions ck-downloads">
            <a className="ck-download" href="https://testflight.apple.com/join/6Q8dfnMX" target="_blank" rel="noreferrer"><PlatformMark platform="ios" /><span><small>{t('actions.joinTestFlight')}</small>TestFlight</span></a>
            <a className="ck-download" href="https://play.google.com/store/apps/details?id=com.clashking.clashkingapp" target="_blank" rel="noreferrer"><PlatformMark platform="android" /><span><small>{t('actions.androidApp')}</small>Google Play</span></a>
          </div>
        </div>
      </section>

      <section className="cs-app cs-bot" id="bot" aria-labelledby="cs-bot-title">
        <div className="cs-product-copy">
          <h2 id="cs-bot-title"><SectionTitle text={t("bot.title")} /></h2>
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
          <h2 id="cs-dashboard-title"><SectionTitle text={t("dashboard.title")} /></h2>
          <p className="cs-section-intro">{t("dashboard.intro")}</p>
          <FeatureList features={dashboardFeatures} />
          <Link className="cs-text-link" href="/login">
            {t("actions.openDashboard")} <ArrowAsset />
          </Link>
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
          <h2 id="cs-resources-title">{t("resources.title").replace(/ClashKing[.。]?/, "").trim()}<br /><span className="section-scribble">ClashKing.<Scribble /></span></h2>
          <p>{t("resources.copy")}</p>
        </div>
        <nav aria-label={t("resources.ariaLabel")}>
          <a href="https://docs.clashk.ing/" target="_blank" rel="noreferrer"><BookOpen className="ck-resource-icon" /><strong>{t("resources.documentation")}</strong><ArrowUpRight /></a>
          <a href="https://github.com/ClashKingInc" target="_blank" rel="noreferrer"><svg className="ck-resource-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-6a5 5 0 0 0-1.4-3.5A4.5 4.5 0 0 0 18.5 2S17.4 1.7 15 3.3a13 13 0 0 0-6 0C6.6 1.7 5.5 2 5.5 2a4.5 4.5 0 0 0-.1 3.5A5 5 0 0 0 4 9c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 3v4" /></svg><strong>GitHub</strong><ArrowUpRight /></a>
          <a href="https://api.clashk.ing/" target="_blank" rel="noreferrer"><Code2 className="ck-resource-icon" /><strong>{t("resources.publicApi")}</strong><ArrowUpRight /></a>
        </nav>
      </section>

      <ClanSignalFooter motionAction={<button type="button" onClick={motion.toggle} aria-pressed={!motion.enabled} disabled={motion.reduced}>{t(motion.reduced ? "rally.reduced" : motion.paused ? "rally.resume" : "rally.pause")}</button>} />
    </main>
  );
}
