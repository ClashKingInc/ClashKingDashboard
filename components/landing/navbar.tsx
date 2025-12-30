"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations("Navigation");

  return (
    <nav className="fixed top-0 w-full bg-[#1F1F1F]/95 backdrop-blur-lg z-50 border-b border-[#DC2626]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="https://assets.clashk.ing/logos/crown-text-dark-bg/ClashKing-with-text-3.svg"
              alt="ClashKing Logo"
              width={100}
              height={100}
              className="h-7 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href={`/${locale}/features`} className="text-gray-300 hover:text-[#EF4444] transition-colors">
              {t("features")}
            </Link>
            <Link href={`/${locale}/open-source`} className="text-gray-300 hover:text-[#EF4444] transition-colors">
              {t("openSource")}
            </Link>
            <Link href={`/${locale}/help`} className="text-gray-300 hover:text-[#EF4444] transition-colors">
              {t("help")}
            </Link>
            <Link href={`/${locale}/support`} className="text-gray-300 hover:text-[#EF4444] transition-colors">
              {t("support")}
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <Button
              onClick={() => initiateDiscordLogin(locale)}
              className="w-full bg-[#DC2626] hover:bg-[#EF4444] text-white border-2 border-[#DC2626]"
            >
              {t("loginWithDiscord")}
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-4 space-y-3">
            <Link href={`/${locale}/features`} className="block py-2 text-gray-700 dark:text-gray-300 hover:text-[#EF4444]">
              {t("features")}
            </Link>
            <Link href={`/${locale}/open-source`} className="block py-2 text-gray-700 dark:text-gray-300 hover:text-[#EF4444]">
              {t("openSource")}
            </Link>
            <Link href={`/${locale}/help`} className="block py-2 text-gray-700 dark:text-gray-300 hover:text-[#EF4444]">
              {t("help")}
            </Link>
            <Link href={`/${locale}/support`} className="block py-2 text-gray-700 dark:text-gray-300 hover:text-[#EF4444]">
              {t("support")}
            </Link>
            <div className="pt-4 space-y-2">
              <div className="flex justify-center mb-2">
                <LanguageSwitcher />
              </div>
              <Button
                onClick={() => initiateDiscordLogin(locale)}
                variant="outline"
                className="w-full"
              >
                {t("loginWithDiscord")}
              </Button>
              <a href="https://invite.clashk.ing/" target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-[#DC2626] hover:bg-[#EF4444] text-white border-2 border-[#DC2626]">
                  {t("addToDiscord")}
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
