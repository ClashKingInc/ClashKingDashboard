/**
 * Token Refresh Interceptor
 * Automatically refreshes tokens on app load and periodically
 */

import { TokenManager } from "./token-manager";
import { ApiClient } from "@/lib/api-client";

let refreshPromise: Promise<void> | null = null;

/**
 * Initialize token refresh interceptor
 * Call this in your root layout or app initialization
 */
export async function initializeTokenRefresh() {
  if (typeof window === 'undefined') return;

  try {
    const isAuthenticated = TokenManager.isAuthenticated();
    if (!isAuthenticated) return;

    const isExpired = TokenManager.isTokenExpired();
    if (!isExpired) return;

    // Try to refresh token
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      TokenManager.clearTokens();
      return;
    }

    if (refreshPromise) {
      // If already refreshing, wait for it
      await refreshPromise;
      return;
    }

    refreshPromise = (async () => {
      try {
        const apiClient = new ApiClient();
        const response = await apiClient.refreshToken(refreshToken);

        TokenManager.setTokens({
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in || 3600,
        });

        console.log("✅ Token refreshed on app load");
      } catch (error) {
        console.error("❌ Failed to refresh token on app load:", error);
        TokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          // Optionally redirect to login
          // window.location.href = '/login';
        }
      } finally {
        refreshPromise = null;
      }
    })();

    await refreshPromise;
  } catch (error) {
    console.error("Token refresh initialization error:", error);
  }
}

/**
 * Start periodic token refresh check
 * Call this in your root layout
 */
export function startPeriodicTokenRefresh(intervalMs = 5 * 60 * 1000) {
  if (typeof window === 'undefined') return;

  const interval = setInterval(() => {
    if (TokenManager.isTokenExpired()) {
      initializeTokenRefresh().catch(console.error);
    }
  }, intervalMs);

  // Cleanup on unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });
  }

  return () => clearInterval(interval);
}
