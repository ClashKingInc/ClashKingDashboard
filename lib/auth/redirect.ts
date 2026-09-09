/**
 * Get the localized login URL
 */
export function getLoginUrl(_locale: string): string {
  return `/login`;
}

/**
 * Get the localized servers URL
 */
export function getServersUrl(_locale: string): string {
  return `/servers`;
}

/**
 * Get the localized auth callback URL
 */
export function getAuthCallbackUrl(_locale: string): string {
  return `/auth/callback`;
}
