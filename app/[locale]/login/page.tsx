"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import { useTheme } from "next-themes";
import { clashKingAssets } from "@/lib/theme";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const params = useParams();
  const locale = params.locale as string;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-trigger Discord login when the page loads
  useEffect(() => {
    initiateDiscordLogin(locale);
  }, [locale]);

  const logoSrc = resolvedTheme === "light"
    ? clashKingAssets.logos.whiteBgPng
    : clashKingAssets.logos.darkBgPng;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("backToHome")}</span>
      </Link>

      <Card className="w-full max-w-md relative z-10 border-2 border-border bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            {mounted && (
              <Image
                src={logoSrc}
                alt="ClashKing"
                width={150}
                height={44}
                loading="eager"
                style={{ width: "auto", height: "auto" }}
              />
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">{t("redirecting")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("redirectingDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    </div>
  );
}
