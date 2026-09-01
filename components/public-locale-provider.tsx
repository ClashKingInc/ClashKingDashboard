import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";
import frenchMessages from "@/messages/fr.json";
import dutchMessages from "@/messages/nl.json";
import type { PublicLocale } from "@/lib/locale-preference";

const messages = {
  en: englishMessages,
  fr: frenchMessages,
  nl: dutchMessages,
} satisfies Record<PublicLocale, typeof englishMessages>;

export function PublicLocaleProvider({
  locale,
  children,
}: {
  readonly locale: PublicLocale;
  readonly children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
