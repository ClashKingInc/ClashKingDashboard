/**
 * Get the localized login URL
 */
export function getLoginUrl(locale: string): string {
  return `/login`;
}

/**
 * Get the localized servers URL
 */
export function getServersUrl(locale: string): string {
  return `/servers`;
}

/**
 * Get the localized auth callback URL
 */
export function getAuthCallbackUrl(locale: string): string {
  return `/auth/callback`;
}
