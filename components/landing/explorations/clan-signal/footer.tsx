"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClanSignalWordmark } from "./brand";
import { isPublicLocale, publicPath, type SupportedLocale } from "@/lib/locale-preference";

export function ClanSignalFooter() {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("ClanSignal");
  const publicLocale = isPublicLocale(locale) ? locale : "en";

  return (
    <div className="cs-footer-scene">
      <div className="cs-bottom-landscape" aria-hidden="true">
        <Image
          src="/concepts/clan-signal/clash-landscape-cutout.webp"
          alt=""
          fill
          sizes="100vw"
          className="cs-bottom-landscape-image"
          unoptimized
        />
      </div>
      <footer className="cs-footer">
        <div className="cs-footer-brand"><ClanSignalWordmark /><p>{t("footer.tagline")}</p></div>
        <div className="cs-footer-links">
          <a href="https://invite.clashk.ing/">{t("navigation.discordBot")}</a>
          <a href="https://testflight.apple.com/join/6Q8dfnMX">{t("navigation.mobileApp")}</a>
          <Link href="/servers">{t("navigation.dashboard")}</Link>
          <a href="https://docs.clashk.ing/">{t("footer.docs")}</a>
          <a href="https://github.com/ClashKingInc">GitHub</a>
          <a href="https://api.clashk.ing/">API</a>
          <Link href={publicPath(publicLocale, "/privacy")}>{t("footer.privacy")}</Link>
          <Link href={publicPath(publicLocale, "/terms")}>{t("footer.terms")}</Link>
        </div>
        <p className="cs-legal">{t("footer.legal")}</p>
      </footer>
    </div>
  );
}
