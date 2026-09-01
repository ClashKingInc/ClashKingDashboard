"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth-session-provider";
import { initiateDiscordLogin } from "@/lib/auth/discord-login";

export default function LoginRedirect() {
  const locale = useLocale();
  const router = useRouter();
  const { status: authStatus } = useAuthSession();
  const loginStarted = useRef(false);

  useEffect(() => {
    if (authStatus === "restoring") return;

    if (authStatus === "authenticated") {
      const returnTo = sessionStorage.getItem("auth_return_to");
      sessionStorage.removeItem("auth_return_to");
      router.replace(returnTo?.startsWith("/") ? returnTo : "/servers");
      return;
    }

    if (loginStarted.current) return;
    loginStarted.current = true;
    void initiateDiscordLogin(locale);
  }, [authStatus, locale, router]);

  return null;
}
