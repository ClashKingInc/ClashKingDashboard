import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClanSignal } from "@/components/landing/explorations/clan-signal";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ClanSignal" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    keywords: ["Clash of Clans bot", "Clash of Clans stats", "Discord bot", "clan management", "war tracking"],
    openGraph: {
      title: t("metadata.openGraphTitle"),
      description: t("hero.copy"),
      type: "website",
      url: "https://clashk.ing",
      images: [
        {
          url: "/og/clashking-landing.png",
          width: 1200,
          height: 630,
          alt: "ClashKing landing page with the Run your clan headline and animated Battle Copter",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.openGraphTitle"),
      description: t("hero.copy"),
      images: ["/og/clashking-landing.png"],
    },
    alternates: { canonical: "/" },
  };
}

export default function HomePage() {
  return <ClanSignal />;
}
