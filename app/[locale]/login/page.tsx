"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import LoadingScreenWithMessages from "@/components/ui/loading-screen-with-messages";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const params = useParams();
  const locale = params.locale as string;

  // Auto-trigger Discord login when the page loads
  useEffect(() => {
    initiateDiscordLogin(locale);
  }, [locale]);

  return (
    <div className="relative">
      <LoadingScreenWithMessages
        messages={{ redirecting: t("redirecting") }}
        description={t("redirectingDescription")}
      />

      <Link
        href={`/${locale}`}
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t("backToHome")}</span>
      </Link>
    </div>
  );
}
