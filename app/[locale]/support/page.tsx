"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Heart, ExternalLink, ShoppingCart, Coffee } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#DC2626] flex items-center justify-center gap-3">
            Support Us <Heart className="text-[#DC2626] fill-[#DC2626]" />
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            ClashKing is a free, open-source project. Your support helps us keep the servers running and continue developing new features for the community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Patreon Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col h-full">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Coffee className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Become a Patron</h2>
            <p className="text-gray-400 mb-8 flex-grow">
              Support us monthly on Patreon to get exclusive perks, early access to features, and help cover our hosting costs.
            </p>
            <Link
              href="https://support.clashk.ing/"
              target="_blank"
              className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-[#EF4444] transition-colors flex items-center justify-center gap-2"
            >
              Support on Patreon <ExternalLink size={18} />
            </Link>
          </div>

          {/* Creator Code Section */}
          <div className="bg-[#2A2A2A] p-8 rounded-2xl border border-[#DC2626]/20 flex flex-col h-full">
            <div className="bg-[#DC2626]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <ShoppingCart className="text-[#DC2626]" size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Use Creator Code</h2>
            <p className="text-gray-400 mb-4">
              Support us for free by using creator code <span className="text-[#DC2626] font-bold">ClashKing</span> in-game or in the Supercell Store.
            </p>
            <div className="space-y-3 mt-auto">
              <Link
                href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking"
                target="_blank"
                className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                Use in Game <ExternalLink size={18} />
              </Link>
              <Link
                href="https://store.supercell.com/nl/clashofclans?boost=clashking"
                target="_blank"
                className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                Use in Supercell Store <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2 text-white">Why support us?</h3>
          <p className="text-gray-400">
            Every contribution, no matter how small, goes directly towards server costs and API fees. 
            Using our creator code costs you nothing extra but helps us immensely!
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
