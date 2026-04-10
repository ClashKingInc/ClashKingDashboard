"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CheckCircle2, Bot, Smartphone, Code2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function FeaturesPage() {
  const t = useTranslations("FeaturesPage");

  const features = [
    {
      id: "bot",
      title: t("sections.bot.title"),
      icon: <Bot className="text-primary" size={32} />,
      description: t("sections.bot.description"),
      items: (t.raw("sections.bot.items") as string[]) ?? [],
      cta: {
        text: t("sections.bot.ctaPrimary"),
        link: "https://invite.clashk.ing/",
        secondaryText: t("sections.bot.ctaSecondary"),
        secondaryLink: "https://discord.clashk.ing/"
      }
    },
    {
      id: "app",
      title: t("sections.app.title"),
      icon: <Smartphone className="text-primary" size={32} />,
      description: t("sections.app.description"),
      items: (t.raw("sections.app.items") as string[]) ?? [],
      cta: {
        text: t("sections.app.ctaPrimary"),
        link: "https://play.google.com/apps/testing/com.clashking.clashkingapp",
        secondaryText: t("sections.app.ctaSecondary"),
        secondaryLink: "https://testflight.apple.com/join/6Q8dfnMX"
      }
    },
    {
      id: "api",
      title: t("sections.api.title"),
      icon: <Code2 className="text-primary" size={32} />,
      description: t("sections.api.description"),
      items: (t.raw("sections.api.items") as string[]) ?? [],
      cta: {
        text: t("sections.api.ctaPrimary"),
        link: "https://api.clashk.ing/",
        secondaryText: t("sections.api.ctaSecondary"),
        secondaryLink: "https://github.com/ClashKingInc/ClashKingAPI"
      }
    }

  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">{t("hero.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>

        <div className="space-y-20">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`flex flex-col lg:flex-row gap-12 items-start ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 bg-card rounded-3xl p-8 md:p-12 border border-primary/20 w-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-2xl">
                    {feature.icon}
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">{feature.title}</h2>
                </div>
                
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  {feature.description}
                </p>

                {feature.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {feature.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3"> // NOSONAR — index is the only stable key for these items (skeleton/static list)
                        <CheckCircle2 className="text-primary mt-1 flex-shrink-0" size={18} />
                        <span className="text-muted-foreground text-sm md:text-base">{item}</span>
                      </div>
                    ))}
                  </div>
                )}


                <div className="flex flex-wrap gap-4">
                  <a
                    href={feature.cta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                  >
                    {feature.cta.text}
                  </a>
                  {feature.cta.secondaryLink && (
                    <a
                      href={feature.cta.secondaryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        feature.id === "app"
                          ? "bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                          : "bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-bold hover:bg-secondary/80 transition-colors border border-border"
                      }
                    >
                      {feature.cta.secondaryText}
                    </a>
                  )}

                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
