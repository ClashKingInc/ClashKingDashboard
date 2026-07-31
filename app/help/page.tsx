"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { BookOpen, MessageSquare, ExternalLink, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HelpPage() {
  const t = useTranslations("HelpPage");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary flex items-center justify-center gap-3">
            {t("title")} <HelpCircle size={40} />
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Documentation Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <BookOpen className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("documentation.title")}</h2>
            <p className="text-muted-foreground mb-8 flex-grow">
              {t("documentation.description")}
            </p>
            <Link
              href="https://docs.clashk.ing/"
              target="_blank"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold text-center hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {t("documentation.cta")} <ExternalLink size={18} />
            </Link>
          </div>

          {/* Discord Support Section */}
          <div className="bg-card p-8 rounded-2xl border border-primary/20 flex flex-col">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <MessageSquare className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">{t("discord.title")}</h2>
            <p className="text-muted-foreground mb-8 flex-grow">
              {t("discord.description")}
            </p>
            <Link
              href="https://discord.clashk.ing/"
              target="_blank"
              className="bg-[#5865F2] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#4752C4] transition-colors flex items-center justify-center gap-2"
            >
              {t("discord.cta")} <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

