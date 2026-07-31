import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClanSignalWordmark } from "./brand";
import { publicPath, type SupportedLocale } from "@/lib/locale-preference";

export async function ClanSignalFooter({ locale = "en" }: { readonly locale?: SupportedLocale }) {
  const t = await getTranslations({ locale, namespace: "ClanSignal" });

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
          <span className="cs-footer-link-disabled" aria-disabled="true">{t("navigation.dashboard")}</span>
          <a href="https://docs.clashk.ing/">{t("footer.docs")}</a>
          <a href="https://github.com/ClashKingInc">GitHub</a>
          <a href="https://go.api.clashk.ing/">API</a>
          <Link href={publicPath(locale, "/privacy")}>{t("footer.privacy")}</Link>
          <Link href={publicPath(locale, "/terms")}>{t("footer.terms")}</Link>
        </div>
        <p className="cs-legal">{t("footer.legal")}</p>
      </footer>
    </div>
  );
}
