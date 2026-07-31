"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth-session-provider";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";
import LoadingScreenWithMessages from "@/components/ui/loading-screen-with-messages";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const locale = useLocale();
  const router = useRouter();
  const { status: authStatus } = useAuthSession();
  const loginStarted = useRef(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/servers");
    } else if (authStatus === "anonymous" && !loginStarted.current) {
      loginStarted.current = true;
      initiateDiscordLogin(locale);
    }
  }, [authStatus, locale, router]);

  return (
    <LoadingScreenWithMessages
      messages={{ redirecting: t("redirecting") }}
    />
  );
}
