"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, TrendingUp, Trophy, Swords, Bell, Settings, Users, BarChart3, Zap, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Auto Role Management",
    description: "Automatically assign roles based on player status, clan position, and achievements. Keep your server organized effortlessly.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: TrendingUp,
    title: "Player Statistics",
    description: "Track detailed player stats, progress graphs, and attack history. See who's improving and who needs help.",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Create competitive leaderboards for donations, trophies, war stars, and custom metrics. Boost engagement.",
    color: "from-amber-500 to-orange-500"
  },
  {
    icon: Swords,
    title: "War Tracking",
    description: "Monitor war lineups, track attacks in real-time, and get post-war analytics. Never miss a war detail.",
    color: "from-red-500 to-rose-500"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Automated reminders for Clan Games, war attacks, Clan War League, and custom events. Keep everyone informed.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Settings,
    title: "Full Customization",
    description: "Customize commands, embed colors, nicknames, and permissions. Make ClashKing truly yours.",
    color: "from-slate-500 to-gray-600"
  },
  {
    icon: Users,
    title: "Family Management",
    description: "Manage multiple clans as a family. Cross-clan stats, shared leaderboards, and unified roles.",
    color: "from-teal-500 to-cyan-500"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into clan performance, player activity patterns, and growth trends. Data-driven decisions.",
    color: "from-fuchsia-500 to-pink-600"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for performance with instant command responses and real-time updates. No lag, no delays.",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: Lock,
    title: "Secure & Reliable",
    description: "99.9% uptime, encrypted data, and regular backups. Your clan data is safe with us.",
    color: "from-slate-500 to-gray-500"
  }
];

export function Features() {
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
              Everything You Need to Manage Your Clan
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Powerful features designed specifically for Clash of Clans communities
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
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
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
