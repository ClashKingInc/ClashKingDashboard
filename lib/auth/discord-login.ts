import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";

/**
 * Initiates Discord OAuth2 login flow with PKCE
 * Can be called from anywhere in the application
 * @param locale - The locale to use for the callback URL (e.g., 'en', 'fr', 'nl')
 */
export async function initiateDiscordLogin(locale: string = 'en') {
  try {
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code_verifier and locale in sessionStorage for callback
    sessionStorage.setItem('discord_code_verifier', codeVerifier);
    sessionStorage.setItem('auth_locale', locale);

    // Build Discord OAuth2 URL with PKCE
    // Use a single redirect URI without locale for easier Discord configuration
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
}
