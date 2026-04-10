"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingScreenWithMessages from "@/components/ui/loading-screen-with-messages";
import { apiClient } from "@/lib/api/client";

export default function AuthCallbackPage() {
  const t = useTranslations("AuthCallback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Discord authentication failed: ${errorParam}`);
      setStatus("error");
      return;
    }

    if (!code) {
      setError("No authorization code received from Discord");
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
          throw new Error("Code verifier not found. Please try logging in again.");
        }

        // Get device ID (or generate one)
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          // Use crypto.randomUUID() if available (HTTPS or localhost)
          // Otherwise, fallback to a simple UUID v4 generator
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
          } else {
            // Fallback UUID v4 generator for HTTP contexts
            deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              const r = Math.trunc(Math.random() * 16);
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
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
        setError(err instanceof Error ? err.message : "Failed to authenticate with Discord");
        setStatus("error");
      }
    };

    authenticateWithDiscord();
  }, [searchParams, router, locale]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Card className="w-full max-w-md border-2 border-[#DC2626] bg-[#1F1F1F]/95">
        <CardHeader className="text-center">
          <CardTitle className="text-[#EF4444]">{t("authenticationFailed")}</CardTitle>
          <CardDescription className="text-gray-400">{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#EF4444] text-white rounded-lg transition-colors"
          >
            {t("tryAgain")}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
