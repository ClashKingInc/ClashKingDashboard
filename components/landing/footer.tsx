"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { clashKingAssets } from "@/lib/theme";

export function Footer() {
  const t = useTranslations("HomePage.footer");
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = mounted && (theme === "light" || resolvedTheme === "light")
    ? clashKingAssets.logos.whiteBgPng
    : clashKingAssets.logos.darkBgPng;

  return (
    <footer className="bg-background border-t border-primary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src={logoSrc}
              alt="ClashKing"
              width={140}
              height={40}
              className="mb-4"
              style={{ width: "auto", height: "auto" }}
            />
            <p className="text-muted-foreground text-sm">
              {t("tagline")}
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("about.title")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/features`} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("about.features")}
                </Link>
              </li>
              <li>
                <Link href={`/help`} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("about.help")}
                </Link>
              </li>
              <li>
                <Link href={`/open-source`} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("about.openSource")}
                </Link>
              </li>
              <li>
                <Link href={`/support`} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("about.support")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Bot */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("bot.title")}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/login`} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("bot.dashboard")}
                </Link>
              </li>
              <li>
                <a href="https://invite.clashk.ing/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("bot.inviteBot")}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("resources.title")}</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.clashk.ing" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("resources.documentation")}
                </a>
              </li>
              <li>
                <a href="https://docs.clashk.ing/quick-start" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("resources.quickStart")}
                </a>
              </li>
              <li>
                <a href="https://git.clashk.ing/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("resources.github")}
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("community.reportBug")}
                </a>
              </li>
              <li>
                <a href="https://github.com/ClashKingInc/ClashKingBot/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("community.requestFeature")}
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("community.title")}</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://discord.clashk.ing/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("community.discord")}
                </a>
              </li>
              <li>
                <a href="https://x.clashk.ing/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("community.twitter")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-primary/30">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} {t("legal.copyright")}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href={`/privacy`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                {t("legal.privacy")}
              </Link>
              <Link href={`/terms`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                {t("legal.terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>

  );
}
