"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { SERVER_COUNT } from "@/lib/constants";

export function CtaSection() {
  const t = useTranslations("HomePage.cta");

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background - ClashKing colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#F03529]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            {t("heading")}
          </h2>

          {/* Description */}
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            {t("description", { serverCount: SERVER_COUNT })}
          </p>

          {/* CTA Button */}
          <a href="https://invite.clashk.ing/" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-white text-[#DC2626] hover:bg-gray-100 text-lg px-10 py-7 rounded-xl shadow-2xl hover:shadow-3xl transition-all group text-base font-semibold border-4 border-white/30">
              {t("button")}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>

          {/* Trust badge */}
          <p className="mt-8 text-sm text-white/80">
            {t("trustBadge", { serverCount: SERVER_COUNT })}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
