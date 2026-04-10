/**
 * ClashKing API Client
 * All API calls go through the backend - NO SECRETS in frontend!
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string | undefined = API_URL) {
    if (!baseUrl) {
      throw new Error("API URL is not set in environment variables.");
    }
    this.baseUrl = baseUrl;
  }

  /**
   * Login with Discord OAuth2
   * Backend handles the CLIENT_SECRET securely
   */
  async loginWithDiscord(code: string, codeVerifier: string) {
    const deviceId = this.getDeviceId();

    const requestBody = {
      code,
      code_verifier: codeVerifier,
      redirect_uri: globalThis.location.origin + '/auth/callback',
      device_id: deviceId,
      device_name: 'Dashboard',
    };

    const response = await fetch(`${this.baseUrl}/v2/auth/discord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current user info
   */
  async getCurrentUser(accessToken: string) {
    const response = await fetch(`${this.baseUrl}/v2/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const response = await fetch(`${this.baseUrl}/v2/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        device_id: this.getDeviceId(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }

  /**
   * Get Discord OAuth2 URL
   * Frontend can know the CLIENT_ID (it's public anyway)
   */
  getDiscordAuthUrl(): string {
    // Option 1: Hardcode (CLIENT_ID is public)
    // Option 2: Fetch from API endpoint that returns just the URL
    return `${this.baseUrl}/v2/auth/discord/url`;
  }

  /**
   * Get or create device ID for this browser
   */
  private getDeviceId(): string | null {
    // Only works in browser context
    if (globalThis.window === undefined) {
      return null;
    }

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
    return deviceId;
  }
}

export const apiClient = new ApiClient();
