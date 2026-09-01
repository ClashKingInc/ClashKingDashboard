import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";
import frenchMessages from "@/messages/fr.json";
import dutchMessages from "@/messages/nl.json";
import type { PublicLocale } from "@/lib/locale-preference";
import { withEnglishFallback, type MessageCatalog } from "@/lib/message-catalog";

const messages = {
  en: englishMessages,
  fr: withEnglishFallback(frenchMessages),
  nl: withEnglishFallback(dutchMessages),
} satisfies Record<PublicLocale, MessageCatalog>;

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
