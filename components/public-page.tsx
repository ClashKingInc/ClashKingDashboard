import { ClanSignal } from "@/components/landing/explorations/clan-signal";
import { PrivacyPolicy } from "@/components/landing/explorations/clan-signal/privacy-policy";
import { TermsOfService } from "@/components/landing/explorations/clan-signal/terms-of-service";
import { PublicLocaleProvider } from "@/components/public-locale-provider";
import { getPublicPageCopy, type PublicPage as PublicPageName } from "@/lib/public-seo";
import type { PublicLocale } from "@/lib/locale-preference";

export function PublicPage({
  locale,
  page,
}: {
  readonly locale: PublicLocale;
  readonly page: PublicPageName;
}) {
  const copy = getPublicPageCopy(locale, page);

  return (
    <PublicLocaleProvider locale={locale}>
      {page === "home" && <ClanSignal />}
      {page === "privacy" && (
        <PrivacyPolicy locale={locale} title={copy.heading} eyebrow={copy.eyebrow} />
      )}
      {page === "terms" && (
        <TermsOfService locale={locale} title={copy.heading} eyebrow={copy.eyebrow} />
      )}
    </PublicLocaleProvider>
  );
}
