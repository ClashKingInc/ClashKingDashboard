"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Heart, ExternalLink, ShoppingCart, Coffee } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SupportPage() {
  const t = useTranslations("SupportPage");

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#DC2626] flex items-center justify-center gap-3">
            {t("title")} <Heart className="text-[#DC2626] fill-[#DC2626]" />
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Patreon Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col h-full">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Coffee className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t("patreon.title")}</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              {t("patreon.description")}
            </p>
            <Link
              href="https://support.clashk.ing/"
              target="_blank"
              className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#EF4444] transition-colors flex items-center justify-center gap-2"
            >
              {t("patreon.cta")} <ExternalLink size={18} />
            </Link>
          </div>

          {/* Creator Code Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col h-full">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <ShoppingCart className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t("creatorCode.title")}</h2>
            <p className="text-gray-400 mb-4">
              {t("creatorCode.description")}{" "}
              <span className="text-[#DC2626] font-bold">ClashKing</span>{" "}
              {t("creatorCode.descriptionSuffix")}
            </p>
            <div className="space-y-3 mt-auto">
              <Link
                href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking"
                target="_blank"
                className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {t("creatorCode.ctaGame")} <ExternalLink size={18} />
              </Link>
              <Link
                href="https://store.supercell.com/nl/clashofclans?boost=clashking"
                target="_blank"
                className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {t("creatorCode.ctaStore")} <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2 text-white">{t("whySupport.title")}</h3>
          <p className="text-gray-400">
            {t("whySupport.description")}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
