import { getTranslations, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-9xl font-bold text-primary">404</h1>
            <h2 className="text-3xl font-semibold">{t("title")}</h2>
            <p className="text-muted-foreground text-lg">{t("description")}</p>
            <Button asChild size="lg">
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
