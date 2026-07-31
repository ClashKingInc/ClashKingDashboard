import { apiClient } from '@/lib/api/client';
import { apiCache } from '@/lib/api-cache';
import { clearSession } from '@/lib/auth/session';

/**
 * Clears all auth tokens from localStorage and the in-memory API client config,
 * then redirects to the login page preserving the current locale.
 */
export async function logout(): Promise<void> {
  await apiClient.auth.logout();
  clearSession();
  sessionStorage.clear();
  apiCache.clear();
  apiClient.clearTokens();
}
