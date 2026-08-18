import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";

const MOBILE_PLATFORM_BOOTSTRAP = `(()=>{const u=navigator.userAgent,p=navigator.platform,t=navigator.maxTouchPoints||0;const m=/android/i.test(u)?"android":/iPhone|iPad|iPod/i.test(u)||(/Mac/i.test(p)&&t>1)?"ios":"unknown";document.documentElement.dataset.mobilePlatform=m})()`;

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL("https://clashk.ing"),
  title: "ClashKing Dashboard",
  description: "Configure your ClashKing bot settings",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOBILE_PLATFORM_BOOTSTRAP }} />
        <link
          rel="preload"
          href="/fonts/clashking.woff2?v=01f23070"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale="en" messages={englishMessages}>
            <LocaleProvider>
              <AuthSessionProvider>
                {children}
                <Toaster />
              </AuthSessionProvider>
            </LocaleProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
