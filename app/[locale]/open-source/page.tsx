"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Github, Code2, BookOpen, Users, ExternalLink, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OpenSourcePage() {
  const t = useTranslations("OpenSourcePage");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary flex items-center justify-center gap-3">
            {t("title")} <Code2 size={40} />
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* GitHub Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Github className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("github.title")}</h2>
            <p className="text-muted-foreground mb-8 flex-grow">
              {t("github.description")}
            </p>
            <div className="space-y-3">
              <Link
                href="https://github.com/ClashKingInc/"
                target="_blank"
                className="w-full bg-foreground text-background px-6 py-3 rounded-lg font-bold text-center hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
              >
                {t("github.ctaPrimary")} <ExternalLink size={18} />
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="https://github.com/ClashKingInc/ClashKingBot"
                  target="_blank"
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-secondary/80 transition-colors border border-border"
                >
                  {t("github.repos.bot")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingApp"
                  target="_blank"
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-secondary/80 transition-colors border border-border"
                >
                  {t("github.repos.app")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAPI"
                  target="_blank"
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-secondary/80 transition-colors border border-border"
                >
                  {t("github.repos.api")}
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAssets"
                  target="_blank"
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-secondary/80 transition-colors border border-border"
                >
                  {t("github.repos.assets")}
                </Link>
              </div>
            </div>
          </div>

          {/* API Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <BookOpen className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("api.title")}</h2>
            <p className="text-muted-foreground mb-8 flex-grow">
              {t("api.description")}
            </p>
            <Link
              href="https://api.clashk.ing/"
              target="_blank"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold text-center hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {t("api.cta")} <ExternalLink size={18} />
            </Link>
          </div>

          {/* Translation Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col md:col-span-2">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Languages className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("translation.title")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("translation.description")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="https://crowdin.com/project/clashkingapp"
                target="_blank"
                className="bg-foreground text-background px-6 py-3 rounded-lg font-bold text-center hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
              >
                {t("translation.app")} <ExternalLink size={18} />
              </Link>
              <Link
                href="https://crowdin.com/project/clashkingbot"
                target="_blank"
                className="bg-foreground text-background px-6 py-3 rounded-lg font-bold text-center hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
              >
                {t("translation.bot")} <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Code2 className="text-primary" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-foreground">{t("pillars.contribute.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pillars.contribute.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Users className="text-primary" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-foreground">{t("pillars.community.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pillars.community.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <BookOpen className="text-primary" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-foreground">{t("pillars.learn.title")}</h3>
              <p className="text-sm text-muted-foreground">
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
