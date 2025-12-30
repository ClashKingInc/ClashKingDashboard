"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Github, Code2, BookOpen, Users, ExternalLink } from "lucide-react";

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#DC2626] flex items-center justify-center gap-3">
            An Open Source Project <Code2 size={40} />
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            ClashKing is a totally free and open source project, and we believe in the power of community to make it even better. Both the bot and the API are fully open source, giving you the freedom to contribute or use them for your own projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* GitHub Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Github className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">GitHub Organization</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Explore our source code, contribute to the bot, or check out our other open-source tools.
            </p>
            <div className="space-y-3">
              <Link
                href="https://github.com/ClashKingInc/"
                target="_blank"
                className="w-full bg-white text-slate-900 px-6 py-3 rounded-lg font-bold text-center hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                View Organization <ExternalLink size={18} />
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="https://github.com/ClashKingInc/ClashKingBot"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  Bot Repo
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingApp"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  App Repo
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAPI"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  API Repo
                </Link>
                <Link
                  href="https://github.com/ClashKingInc/ClashKingAssets"
                  target="_blank"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-gray-600 transition-colors"
                >
                  Assets Repo
                </Link>
              </div>
            </div>
          </div>

          {/* API Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <BookOpen className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">API Documentation</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Build your own tools or projects using the ClashKing API. It’s free to use as long as you credit the ClashKing project.
            </p>
            <Link
              href="https://api.clashk.ing/"
              target="_blank"
              className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#EF4444] transition-colors flex items-center justify-center gap-2"
            >
              API Docs <ExternalLink size={18} />
            </Link>
          </div>
        </div>

        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Code2 className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">Contribute</h3>
              <p className="text-sm text-gray-400">
                Help us improve by fixing bugs, adding new features, or enhancing existing ones. Every contribution counts!
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">Community</h3>
              <p className="text-sm text-gray-400">
                Join our Discord community to discuss ideas, get help, and collaborate with other developers.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#2A2A2A] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-[#DC2626]" size={20} />
              </div>
              <h3 className="font-bold mb-2 text-white">Learn</h3>
              <p className="text-sm text-gray-400">
                Check out our documentation and examples to learn how to use the bot and API effectively.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
