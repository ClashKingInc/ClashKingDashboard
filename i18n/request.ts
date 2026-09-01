import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { withEnglishFallback } from '@/lib/message-catalog';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale parameter is valid
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: withEnglishFallback((await import(`../messages/${locale}.json`)).default)
  };
});
