import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";

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
        <link rel="preconnect" href="https://assets.clashk.ing" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="https://assets.clashk.ing/fonts/clashking.woff2"
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
