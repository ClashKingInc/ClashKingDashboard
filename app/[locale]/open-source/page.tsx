"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Github, Code2, BookOpen, Users, ExternalLink, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OpenSourcePage() {
  const t = useTranslations("OpenSourcePage");

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#DC2626] flex items-center justify-center gap-3">
            {t("title")} <Code2 size={40} />
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* GitHub Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Github className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t("github.title")}</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              {t("github.description")}
            </p>
            <div className="space-y-3">
              <Link
                href="https://github.com/ClashKingInc/"
                target="_blank"
                className="w-full bg-white text-slate-900 px-6 py-3 rounded-lg font-bold text-center hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                {t("github.ctaPrimary")} <ExternalLink size={18} />
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="https://github.com/ClashKingInc/ClashKingBot"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  {t("github.repos.bot")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingApp"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  {t("github.repos.app")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAPI"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  {t("github.repos.api")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAssets"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  {t("github.repos.assets")}
                </Link>
              </div>
            </div>
          </div>

          {/* API Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <BookOpen className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t("api.title")}</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              {t("api.description")}
            </p>
            <Link
              href="https://api.clashk.ing/"
              target="_blank"
              className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#EF4444] transition-colors flex items-center justify-center gap-2"
            >
              {t("api.cta")} <ExternalLink size={18} />
            </Link>
          </div>

          {/* Translation Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col md:col-span-2">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Languages className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t("translation.title")}</h2>
            <p className="text-gray-400 mb-8">
              {t("translation.description")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="https://crowdin.com/project/clashkingapp"
                target="_blank"
                className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold text-center hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                {t("translation.app")} <ExternalLink size={18} />
              </Link>
              <Link
                href="https://crowdin.com/project/clashkingbot"
                target="_blank"
                className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold text-center hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                {t("translation.bot")} <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Code2 className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">{t("pillars.contribute.title")}</h3>
              <p className="text-sm text-gray-400">
                {t("pillars.contribute.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">{t("pillars.community.title")}</h3>
              <p className="text-sm text-gray-400">
                {t("pillars.community.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">{t("pillars.learn.title")}</h3>
              <p className="text-sm text-gray-400">
                {t("pillars.learn.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
