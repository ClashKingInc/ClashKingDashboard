"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
    <LoadingScreenWithMessages
      messages={{ redirecting: t("redirecting") }}
    />
  );
}
