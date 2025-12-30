"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { BookOpen, MessageSquare, ExternalLink, HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#DC2626] flex items-center justify-center gap-3">
            Need Help? <HelpCircle size={40} />
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Whether you're looking for documentation or direct support, we've got you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Documentation Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <BookOpen className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Documentation</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Check out our comprehensive guides and command references to get the most out of ClashKing.
            </p>
            <Link
              href="https://docs.clashk.ing/"
              target="_blank"
              className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#EF4444] transition-colors flex items-center justify-center gap-2"
            >
              View Docs <ExternalLink size={18} />
            </Link>
          </div>

          {/* Discord Support Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <MessageSquare className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Discord Support</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Need more help? Join our Discord community to ask questions, report bugs, or chat with other users.
            </p>
            <Link
              href="http://discord.clashk.ing/"
              target="_blank"
              className="bg-[#5865F2] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#4752C4] transition-colors flex items-center justify-center gap-2"
            >
              Join Discord <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
