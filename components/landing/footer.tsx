"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations("HomePage.footer");

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
              {t("tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t("product.title")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("product.features")}
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("product.premium")}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/login`} className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("product.dashboard")}
                </Link>
              </li>
              <li>
                <a href="https://discord.com/application-directory/824653933347209227" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("product.inviteBot")}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t("resources.title")}</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.clashk.ing" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("resources.documentation")}
                </a>
              </li>
              <li>
                <a href="https://docs.clashk.ing/quick-start" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("resources.quickStart")}
                </a>
              </li>
              <li>
                <a href="https://discord.gg/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("resources.support")}
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("resources.github")}
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t("community.title")}</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://discord.gg/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("community.discord")}
                </a>
              </li>
              <li>
                <a href="https://twitter.com/clashking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("community.twitter")}
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("community.reportBug")}
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#EF4444] transition-colors">
                  {t("community.requestFeature")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#DC2626]/30">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} {t("legal.copyright")}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-[#EF4444] text-sm transition-colors">
                {t("legal.privacy")}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-[#EF4444] text-sm transition-colors">
                {t("legal.terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
