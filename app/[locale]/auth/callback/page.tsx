"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          }
          localStorage.setItem('device_id', deviceId);
        }

        console.log('🔍 Device ID being sent:', deviceId);

        const requestBody = {
          code,
          code_verifier: codeVerifier,
          redirect_uri: window.location.origin + '/auth/callback',
          device_id: deviceId,
          device_name: 'Dashboard',
        };

        console.log('📤 Request body:', requestBody);

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
        console.log("✅ Authentication response:", data);

        // Debug: Decode JWT to see what's inside
        try {
          const tokenParts = data.access_token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("🔍 JWT Payload:", payload);
        } catch (e) {
          console.error("Failed to decode JWT:", e);
        }

        // Store tokens
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        console.log("Access Token:", data.access_token);
        console.log("Refresh Token:", data.refresh_token);
        console.log("User Info:", data.user);

        console.log("✅ Tokens stored, redirecting to /servers");

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Card className="w-full max-w-md border-2 border-[#2A2A2A] bg-[#1F1F1F]/95">
          <CardHeader className="text-center">
            <CardTitle className="text-white">{t("authenticating")}</CardTitle>
            <CardDescription className="text-gray-400">
              {t("authenticatingDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
          </CardContent>
        </Card>
      </div>
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
