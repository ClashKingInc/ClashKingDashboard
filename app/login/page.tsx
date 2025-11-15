"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const handleDiscordLogin = async () => {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code_verifier in sessionStorage for callback
      sessionStorage.setItem('discord_code_verifier', codeVerifier);

      // Build Discord OAuth2 URL with PKCE
      const redirectUri = window.location.origin + '/auth/callback';
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

      if (!clientId) {
        throw new Error("Discord Client ID is not set in environment variables.");
      }

      const discordAuthUrl = new URL("https://discord.com/api/oauth2/authorize");
      discordAuthUrl.searchParams.append("client_id", clientId);
      discordAuthUrl.searchParams.append("redirect_uri", redirectUri);
      discordAuthUrl.searchParams.append("response_type", "code");
      discordAuthUrl.searchParams.append("scope", "identify guilds");
      discordAuthUrl.searchParams.append("code_challenge", codeChallenge);
      discordAuthUrl.searchParams.append("code_challenge_method", "S256");

      // Redirect to Discord
      window.location.href = discordAuthUrl.toString();
    } catch (error) {
      console.error("Failed to initiate Discord login:", error);
      alert("Failed to initiate Discord login. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#DC2626]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#F03529]/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Link
        href="/en"
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
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
          <CardTitle className="text-3xl font-bold text-white">Dashboard Login</CardTitle>
          <CardDescription className="text-gray-400">
            Login with Discord to manage your ClashKing bot settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDiscordLogin}
            className="w-full h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Login with Discord
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#1F1F1F] px-2 text-gray-500">Secure OAuth2 Authentication</span>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500">
            By logging in, you agree to allow ClashKing to access your Discord server list
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
