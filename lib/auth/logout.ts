import { apiClient } from '@/lib/api/client';
import { apiCache } from '@/lib/api-cache';
import { clearSession } from '@/lib/auth/session';
import { clearRosterBuilderChats } from '@/lib/roster-builder-session';
import { embeddedServerId } from './embedded';
import { getDefaultBaseUrl } from '@/lib/api/client';

/**
 * Clears all auth tokens from localStorage and the in-memory API client config,
 * then redirects to the login page preserving the current locale.
 */
export async function logout(): Promise<void> {
  const serverId=embeddedServerId();
  if(serverId){await fetch(`${getDefaultBaseUrl()}/v2/auth/server-dashboard/logout`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverId})});clearSession(false);return;}
  await apiClient.auth.logout();
  clearRosterBuilderChats();
  clearSession();
  sessionStorage.clear();
  apiCache.clear();
  apiClient.clearTokens();
}
