import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";
import frenchMessages from "@/messages/fr.json";
import dutchMessages from "@/messages/nl.json";
import type { SupportedLocale } from "@/lib/locale-preference";

const messages = {
  en: englishMessages,
  fr: frenchMessages,
  nl: dutchMessages,
} satisfies Record<SupportedLocale, typeof englishMessages>;

export function PublicLocaleProvider({
  locale,
  children,
}: {
  readonly locale: SupportedLocale;
  readonly children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
