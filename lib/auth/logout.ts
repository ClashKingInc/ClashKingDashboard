import { apiClient } from '@/lib/api/client';

/**
 * Clears all auth tokens from localStorage and the in-memory API client config,
 * then redirects to the login page preserving the current locale.
 */
export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  apiClient.clearTokens();
}
