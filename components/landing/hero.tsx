"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import { useTranslations } from "next-intl";
import { SERVER_COUNT } from "@/lib/constants";

export function Hero() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations("HomePage");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("access_token"));
  }, []);

  const handleDashboardClick = () => {
    if (isLoggedIn) {
      router.push(`/${locale}/servers`);
    } else {
      initiateDiscordLogin(locale);
    }
  };

  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background gradient - ClashKing theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background" />

      {/* Animated background elements - ClashKing colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 border-2 border-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("badge", { serverCount: SERVER_COUNT })}</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
          >
            {t("title")}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/60">
              {t("titleHighlight")}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            {t("subtitle")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a href="https://invite.clashk.ing/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all group border-2 border-primary">
                {t("cta.addToDiscord")}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              onClick={handleDashboardClick}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-xl border-2 border-border hover:bg-accent"
            >
              {t("cta.openDashboard")}
            </Button>
          </motion.div>


          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            <div className="text-center p-6 bg-card rounded-2xl backdrop-blur-sm border-4 border-primary/60 shadow-lg">
              <div className="text-4xl font-bold text-primary mb-2">12.5K+</div>
              <div className="text-card-foreground">{t("stats.servers")}</div>
            </div>
            <div className="text-center p-6 bg-card rounded-2xl backdrop-blur-sm border-4 border-primary/60 shadow-lg">
              <div className="text-4xl font-bold text-primary mb-2">500K+</div>
              <div className="text-card-foreground">{t("stats.users")}</div>
            </div>
            <div className="text-center p-6 bg-card rounded-2xl backdrop-blur-sm border-4 border-primary/60 shadow-lg">
              <div className="text-4xl font-bold text-primary mb-2">25K+</div>
              <div className="text-card-foreground">{t("stats.clans")}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
