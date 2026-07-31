"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import LoadingScreenWithMessages from "@/components/ui/loading-screen-with-messages";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const locale = useLocale();

  // Auto-trigger Discord login when the page loads
  useEffect(() => {
    initiateDiscordLogin(locale);
  }, [locale]);

  return (
    <LoadingScreenWithMessages
      messages={{ redirecting: t("redirecting") }}
    />
  );
}
