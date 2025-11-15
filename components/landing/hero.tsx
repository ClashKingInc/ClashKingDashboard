"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background gradient - ClashKing theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1F1F1F] via-[#2A2A2A] to-[#1F1F1F]" />

      {/* Animated background elements - ClashKing colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#DC2626]/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#F03529]/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626]/20 rounded-full text-[#EF4444] text-sm font-medium mb-8 border-2 border-[#DC2626]/50"
          >
            <Sparkles className="w-4 h-4" />
            <span>12,500+ servers already using ClashKing</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            The Most Powerful
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DC2626] via-[#EF4444] to-[#F03529]">
              Clash of Clans Bot
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Automate your clan management, track player stats, manage wars, and keep your community engaged—all from Discord.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a href="https://discord.com/application-directory/824653933347209227" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-[#DC2626] hover:bg-[#EF4444] text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all group border-2 border-[#DC2626]">
                Add to Discord
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2">
                Open Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            <div className="text-center p-6 bg-[#2A2A2A]/70 rounded-2xl backdrop-blur-sm border-2 border-[#DC2626]/50">
              <div className="text-4xl font-bold text-[#DC2626] mb-2">12.5K+</div>
              <div className="text-gray-300">Discord Servers</div>
            </div>
            <div className="text-center p-6 bg-[#2A2A2A]/70 rounded-2xl backdrop-blur-sm border-2 border-[#EF4444]/50">
              <div className="text-4xl font-bold text-[#EF4444] mb-2">500K+</div>
              <div className="text-gray-300">Active Users</div>
            </div>
            <div className="text-center p-6 bg-[#2A2A2A]/70 rounded-2xl backdrop-blur-sm border-2 border-[#F03529]/50">
              <div className="text-4xl font-bold text-[#F03529] mb-2">25K+</div>
              <div className="text-gray-300">Clans Tracked</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
