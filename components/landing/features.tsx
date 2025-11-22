"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, TrendingUp, Trophy, Swords, Bell, Settings, Users, BarChart3, Zap, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export function Features() {
  const t = useTranslations("HomePage.features");

  const features = [
    {
      icon: Shield,
      titleKey: "autoRoles.title",
      descriptionKey: "autoRoles.description",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingUp,
      titleKey: "playerStats.title",
      descriptionKey: "playerStats.description",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Trophy,
      titleKey: "leaderboards.title",
      descriptionKey: "leaderboards.description",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Swords,
      titleKey: "warTracking.title",
      descriptionKey: "warTracking.description",
      color: "from-red-500 to-rose-500"
    },
    {
      icon: Bell,
      titleKey: "smartReminders.title",
      descriptionKey: "smartReminders.description",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Settings,
      titleKey: "customization.title",
      descriptionKey: "customization.description",
      color: "from-slate-500 to-gray-600"
    },
    {
      icon: Users,
      titleKey: "familyManagement.title",
      descriptionKey: "familyManagement.description",
      color: "from-teal-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      titleKey: "analytics.title",
      descriptionKey: "analytics.description",
      color: "from-fuchsia-500 to-pink-600"
    },
    {
      icon: Zap,
      titleKey: "performance.title",
      descriptionKey: "performance.description",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Lock,
      titleKey: "security.title",
      descriptionKey: "security.description",
      color: "from-slate-500 to-gray-500"
    }
  ];

  return (
    <section id="features" className="py-24 px-4 bg-[#1F1F1F]">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {t("title")}
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </motion.div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-2 border-[#2A2A2A] hover:border-[#DC2626] transition-all duration-300 hover:shadow-xl group bg-[#2A2A2A]">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {t(feature.descriptionKey)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
