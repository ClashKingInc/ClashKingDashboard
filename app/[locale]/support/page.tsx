"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Heart, ExternalLink, ShoppingCart, Coffee } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SupportPage() {
  const t = useTranslations("SupportPage");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary flex items-center justify-center gap-3">
            {t("title")} <Heart className="text-primary fill-primary" />
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Patreon Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col h-full">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Coffee className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("patreon.title")}</h2>
            <p className="text-muted-foreground mb-8 flex-grow">
              {t("patreon.description")}
            </p>
            <Link
              href="https://support.clashk.ing/"
              target="_blank"
              className="bg-primary text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {t("patreon.cta")} <ExternalLink size={18} />
            </Link>
          </div>

          {/* Creator Code Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col h-full">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <ShoppingCart className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("creatorCode.title")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("creatorCode.description")}{" "}
              <span className="text-primary font-bold">ClashKing</span>{" "}
              {t("creatorCode.descriptionSuffix")}
            </p>
            <div className="space-y-3 mt-auto">
              <Link
                href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking"
                target="_blank"
                className="w-full bg-muted text-foreground px-6 py-3 rounded-lg font-bold text-center hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
              >
                {t("creatorCode.ctaGame")} <ExternalLink size={18} />
              </Link>
              <Link
                href="https://store.supercell.com/nl/clashofclans?boost=clashking"
                target="_blank"
                className="w-full bg-muted text-foreground px-6 py-3 rounded-lg font-bold text-center hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
              >
                {t("creatorCode.ctaStore")} <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2 text-foreground">{t("whySupport.title")}</h3>
          <p className="text-muted-foreground">
            {t("whySupport.description")}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
