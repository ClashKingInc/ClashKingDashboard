import { useLocale, useTranslations } from "use-intl";
import Link from "@/components/app-link";
import { ClanSignalPageShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import { publicPath, type PublicLocale } from "@/lib/locale-preference";

export default function NotFound() {
  const t = useTranslations("NotFound");
  const locale = useLocale() as PublicLocale;

  return (
    <ClanSignalPageShell
      eyebrow="404"
      title={t("title")}
      description={t("description")}
      contentClassName="cs-not-found-actions"
    >
      <Link className="cs-button" href={publicPath(locale, "/")}>{t("goHome")}</Link>
    </ClanSignalPageShell>
  );
}
