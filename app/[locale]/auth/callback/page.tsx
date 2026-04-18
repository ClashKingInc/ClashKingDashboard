"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import LoadingScreenWithMessages from "@/components/ui/loading-screen-with-messages";
import { apiClient } from "@/lib/api/client";
import { clashKingAssets } from "@/lib/theme";

export default function AuthCallbackPage() {
  const t = useTranslations("AuthCallback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasHandledCallbackRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasHandledCallbackRef.current) {
      return;
    }

    hasHandledCallbackRef.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      // User canceled the Discord authorization flow.
      if (errorParam === "access_denied") {
        sessionStorage.removeItem("discord_code_verifier");
        setError(t("errorCancelled"));
        setStatus("error");
        return;
      }

      setError(t("errorDiscordFailedWithReason", { reason: errorDescription || errorParam }));
      setStatus("error");
      return;
    }

    if (!code) {
      setError(t("errorNoAuthorizationCode"));
      setStatus("error");
      return;
    }

    // Exchange code for token via API
    const authenticateWithDiscord = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error("API URL is not set in environment variables.");
        }

        // Retrieve code_verifier from sessionStorage
        const codeVerifier = sessionStorage.getItem('discord_code_verifier');
        if (!codeVerifier) {
          throw new Error(t("errorCodeVerifierMissing"));
        }

        // Get device ID (or generate one)
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          // Use crypto.randomUUID() if available (HTTPS or localhost)
          // Otherwise, fallback to a simple UUID v4 generator
          if (crypto.randomUUID) {
            deviceId = crypto.randomUUID();
          } else {
            // Fallback: crypto.getRandomValues is available in all contexts (unlike randomUUID)
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            deviceId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
          }
          localStorage.setItem('device_id', deviceId);
        }

        const requestBody = {
          code,
          code_verifier: codeVerifier,
          redirect_uri: globalThis.location.origin + '/auth/callback',
          device_id: deviceId,
          device_name: 'Dashboard',
        };

        // Call ClashKing API to exchange code for tokens
        const response = await fetch(`${apiUrl}/v2/auth/discord`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
          throw new Error(errorData.detail || errorData.message || `Authentication failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Prefetch guilds to avoid loading screen on servers page
        try {
          apiClient.setAccessToken(data.access_token);
          const guildsResponse = await apiClient.servers.getGuilds();
          if (guildsResponse.data) {
            // Sort guilds: servers with bot first, then by name
            const sortedGuilds = guildsResponse.data.toSorted((a, b) => {
              // Primary sort: has_bot (true first)
              if (a.has_bot && !b.has_bot) return -1;
              if (!a.has_bot && b.has_bot) return 1;
              // Secondary sort: alphabetically by name
              return a.name.localeCompare(b.name);
            });
            sessionStorage.setItem('prefetched_guilds', JSON.stringify(sortedGuilds));
          }
        } catch (err) {
          console.error('Failed to prefetch guilds:', err);
          // Still redirect, it will fetch on servers page
        }

        // Clean up
        sessionStorage.removeItem('discord_code_verifier');

        // Redirect to servers page
        router.push(`/${locale}/servers`);
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err instanceof Error ? err.message : t("errorAuthenticateFailed"));
        setStatus("error");
      }
    };

    void authenticateWithDiscord();
  }, [searchParams, router, locale, t]);

  if (status === "loading") {
    return (
      <LoadingScreenWithMessages
        messages={{
          loadingVillages: t("loadingVillages"),
          loadingClanData: t("loadingClanData"),
          loadingWarStats: t("loadingWarStats")
        }}
      />
    );
  }

  const mainLogoUrl = mounted && theme === "light"
    ? clashKingAssets.logos.whiteBgPng
    : clashKingAssets.logos.darkBgPng;

  const textLogoUrl = mounted && theme === "light"
    ? clashKingAssets.logos.textWhiteBg
    : clashKingAssets.logos.textDarkBg;

  return (
    <div
      className={`flex min-h-screen items-center justify-center ${
        mounted && theme === "light"
          ? "bg-gradient-to-br from-gray-100 via-white to-gray-100"
          : "bg-gradient-to-br from-gray-900 via-black to-gray-900"
      }`}
    >
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-none flex items-center justify-center">
            {mounted ? (
              <Image
                src={mainLogoUrl}
                alt="ClashKing Logo"
                width={80}
                height={80}
                className="object-contain"
                priority
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <div className="w-20 h-20 rounded-none animate-pulse bg-gray-700" />
            )}
          </div>

          <div className="mt-4 h-8 flex items-center justify-center">
            {mounted ? (
              <Image
                src={textLogoUrl}
                alt="ClashKing Text"
                width={120}
                height={32}
                className="object-contain"
                priority
                style={{ width: 120, height: 32 }}
              />
            ) : (
              <div className="w-30 h-8 rounded animate-pulse bg-gray-700" />
            )}
          </div>

          <div className="h-24" />

          <div className="w-full rounded-xl border border-[#DC2626]/70 bg-[#1F1F1F]/95 p-6 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-[#EF4444]">{t("authenticationFailed")}</h1>
            <p className="mt-3 text-sm text-gray-300">{error}</p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push(`/${locale}/login`)}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-white transition-colors hover:bg-[#EF4444]"
              >
                {t("tryAgain")}
              </button>
              <button
                onClick={() => router.push(`/${locale}`)}
                className="rounded-lg bg-black px-4 py-2 text-white transition-colors hover:bg-neutral-800"
              >
                {t("backToHome")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
