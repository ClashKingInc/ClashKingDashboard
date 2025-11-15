import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#1F1F1F] border-t border-[#DC2626]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Image
              src="https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.png"
              alt="ClashKing"
              width={140}
              height={40}
              className="mb-4"
            />
            <p className="text-gray-400 text-sm">
              The most powerful Clash of Clans bot for Discord communities.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Premium
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="https://discord.com/application-directory/824653933347209227" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Invite Bot
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.clashk.ing" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://docs.clashk.ing/quick-start" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Quick Start Guide
                </a>
              </li>
              <li>
                <a href="https://discord.gg/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Support Server
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://discord.gg/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Discord Server
                </a>
              </li>
              <li>
                <a href="https://twitter.com/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Report a Bug
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  Request Feature
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#DC2626]/30">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} ClashKing. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-[#EF4444] text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-[#EF4444] text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
