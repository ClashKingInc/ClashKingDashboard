"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const params = useParams();
  const locale = params.locale as string;

  // Auto-trigger Discord login when the page loads
  useEffect(() => {
    initiateDiscordLogin(locale);
  }, [locale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#DC2626]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#F03529]/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Link
        href={`/${locale}`}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("backToHome")}</span>
      </Link>

      <Card className="w-full max-w-md relative z-10 border-2 border-[#2A2A2A] bg-[#1F1F1F]/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <Image
              src="https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.png"
              alt="ClashKing"
              width={150}
              height={44}
              className="h-11 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-white">{t("redirecting")}</CardTitle>
          <CardDescription className="text-gray-400">
            {t("redirectingDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
        </CardContent>
      </Card>
    </div>
  );
}
